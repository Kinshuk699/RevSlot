"use server";

import { auth } from "@clerk/nextjs/server";
import type { AdSlot } from "@/components/VibePlayer";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

/* ═══════════════════════════  Types  ═══════════════════════════════ */

type ProcessVideoInput = {
  sourceVideoUrl: string;
  brand: string;
  productDescription: string;
  buyUrl?: string;
  productImageUrl?: string;
  /** base64 data-URL of the extracted video frame (JPEG) */
  frameDataUrl?: string;
  /** base64 data-URL of the inpainting mask (PNG, white=inpaint area) */
  maskDataUrl?: string;
  /** user-chosen timestamp in the video to place the product */
  timestamp?: number;
  /** user-drawn mask region (0-1 normalised coordinates) */
  maskRegion?: { x: number; y: number; w: number; h: number };
};

export type ProcessVideoResult = {
  status: "ready";
  /** The original source video URL (always returned for splicing) */
  originalVideoUrl: string;
  /** URL of the AI-generated clip with the product placed in it (null if pipeline failed) */
  aiClipUrl: string | null;
  /** The inpainted frame image URL */
  inpaintedFrameUrl: string | null;
  /** Legacy — kept for fallback; equals aiClipUrl or originalVideoUrl */
  processedVideoUrl: string;
  adSlot: AdSlot;
  /** The timestamp at which the AI clip should be inserted */
  insertAtTimestamp: number;
  savedToSupabase: boolean;
  saveError?: string;
};

/* ═══════════════════════════  Constants  ═══════════════════════════ */

const DEFAULT_TIMESTAMP = 3;
const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80";
const FAL_POLL_INTERVAL = 3_000;
const FAL_MAX_POLLS = 90; // 90 × 3 s = 4.5 min max wait

/* ═══════ Step 0 — Analyse the frame to understand the scene ═══════ */

async function analyzeScene(
  frameDataUrl: string,
  falKey: string,
): Promise<string | null> {
  console.log("[Fal] Step 0 → Analysing scene for natural placement …");
  try {
    const res = await fetch("https://fal.run/fal-ai/llavav15-13b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({
        image_url: frameDataUrl,
        prompt:
          "Describe this image in one concise sentence. Focus on: the setting/environment, " +
          "key objects and surfaces visible (tables, desks, shelves, floors, hands, walls), " +
          "and the lighting conditions (warm, cool, natural, artificial, directional).",
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("[Fal] Scene analysis failed:", res.status);
      return null;
    }

    const data = (await res.json()) as { output?: string; result?: string };
    const description = data.output ?? data.result ?? null;
    console.log("[Fal] Scene description:", description);
    return description;
  } catch (err) {
    console.warn("[Fal] Scene analysis exception:", err);
    return null;
  }
}

/* ═══════ Step 1 — Inpaint product onto extracted frame ════════ */

async function inpaintProductOnFrame(input: {
  frameDataUrl: string;
  maskDataUrl?: string;
  brand: string;
  productDescription: string;
  sceneDescription?: string | null;
}): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("[Fal] FAL_KEY missing — skipping inpainting");
    return null;
  }

  const product = input.productDescription
    ? `${input.productDescription} by ${input.brand}`
    : `a premium ${input.brand} product`;

  // Build a context-aware prompt using scene analysis when available
  const sceneContext = input.sceneDescription
    ? `In this scene — ${input.sceneDescription} — `
    : "In this scene, ";

  const prompt = [
    `${sceneContext}a photorealistic ${product} has been naturally placed,`,
    "seamlessly blending with the environment as if it was always part of the original photograph.",
    "The product matches the exact perspective, lighting direction, shadow angles,",
    "surface reflections, and color temperature of the surrounding scene.",
    "Photorealistic, commercial product photography quality, 8k resolution.",
  ].join(" ");

  console.log("[Fal] Step 1 → Inpainting product onto frame …");

  // Build request body — use proper fal-ai/inpaint endpoint with mask image
  const body: Record<string, unknown> = {
    model_name: "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
    image_url: input.frameDataUrl,
    prompt,
    negative_prompt:
      "blurry, distorted, text, watermark, cartoon, low quality, unrealistic, floating, flying, " +
      "out of place, different lighting, wrong perspective, pasted on, collage, composite, " +
      "cut out, photoshopped, unnatural shadows",
    num_inference_steps: 35,
    guidance_scale: 7.5,
  };

  if (input.maskDataUrl) {
    body.mask_url = input.maskDataUrl;
  }

  try {
    const res = await fetch("https://fal.run/fal-ai/inpaint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[Fal] Inpaint error", res.status, errText);
      return null;
    }

    // fal-ai/inpaint returns { image: { url } } (singular, not array)
    const data = (await res.json()) as { image?: { url?: string } };
    const url = data.image?.url ?? null;
    console.log("[Fal] Inpainted:", url ? "✓ " + url.slice(0, 80) : "✗ no image");
    return url;
  } catch (err) {
    console.error("[Fal] Inpaint exception:", err);
    return null;
  }
}

/* ═══════ Step 2 — Animate inpainted frame → video (Kling i2v) ═════ */

async function generateVideoFromFrame(input: {
  imageUrl: string;
  brand: string;
  productDescription: string;
}): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  const prompt = [
    `Smooth cinematic shot featuring ${input.productDescription} by ${input.brand},`,
    "subtle natural camera sway, photorealistic, commercial film grain,",
    "soft depth-of-field, ambient lighting, 24 fps.",
  ].join(" ");

  console.log("[Fal] Step 2 → Submitting image-to-video (Kling) …");

  try {
    // ── Submit to queue ──
    const submitRes = await fetch(
      "https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${falKey}`,
        },
        body: JSON.stringify({
          image_url: input.imageUrl,
          prompt,
          duration: "5",
          aspect_ratio: "16:9",
        }),
      },
    );

    if (!submitRes.ok) {
      console.error("[Fal] Video submit error", submitRes.status, await submitRes.text().catch(() => ""));
      return null;
    }

    const { request_id } = (await submitRes.json()) as { request_id: string };
    console.log("[Fal] Queued request:", request_id);

    // ── Poll until done ──
    for (let i = 0; i < FAL_MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, FAL_POLL_INTERVAL));

      const statusRes = await fetch(
        `https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video/requests/${request_id}/status`,
        { headers: { Authorization: `Key ${falKey}` } },
      );

      if (!statusRes.ok) continue;

      const { status } = (await statusRes.json()) as { status: string };
      if (i % 5 === 0) console.log(`[Fal] Poll ${i + 1}/${FAL_MAX_POLLS}: ${status}`);

      if (status === "COMPLETED") {
        const resultRes = await fetch(
          `https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video/requests/${request_id}`,
          { headers: { Authorization: `Key ${falKey}` } },
        );
        if (!resultRes.ok) return null;

        const result = (await resultRes.json()) as { video?: { url?: string } };
        console.log("[Fal] Video:", result.video?.url ? "✓" : "✗");
        return result.video?.url ?? null;
      }

      if (status === "FAILED") {
        console.error("[Fal] Video generation FAILED");
        return null;
      }
    }

    console.error("[Fal] Video generation timed out");
    return null;
  } catch (err) {
    console.error("[Fal] Video exception:", err);
    return null;
  }
}

/* ═══════ Fallback — text-to-image product photo (flux/schnell) ════ */

async function generateProductImage(brand: string, productDescription: string): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  const phrase = productDescription ? `${productDescription} by ${brand}` : `a premium ${brand} product`;
  const prompt = `Professional product photography: ${phrase}. Centered on a clean background, studio lighting, photorealistic, 8k. No text, no watermarks.`;

  try {
    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
      body: JSON.stringify({ prompt, image_size: "square_hd", num_images: 1 }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { images?: { url?: string }[] };
    return data.images?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

/* ═══════════════════  Save to Supabase  ═══════════════════════════ */

async function saveProcessedVideo(params: {
  clerkUserId: string;
  sourceVideoUrl: string;
  processedVideoUrl: string;
  adSlot: AdSlot;
  promptContext: string;
}) {
  const supabase = getSupabaseServiceRoleClient();

  const { error } = await supabase.from("videos").insert({
    clerk_user_id: params.clerkUserId,
    source_video_url: params.sourceVideoUrl,
    processed_video_url: params.processedVideoUrl,
    ad_slot: params.adSlot,
    status: "ready",
    prompt_context: params.promptContext,
  });

  if (error) return { savedToSupabase: false, saveError: error.message };
  return { savedToSupabase: true as const };
}

/* ═══════════════════  Main server action  ═════════════════════════ */

export async function processVideoAction(
  input: ProcessVideoInput,
): Promise<ProcessVideoResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  if (!input.sourceVideoUrl) throw new Error("Video URL is required.");

  const timestamp = input.timestamp ?? DEFAULT_TIMESTAMP;
  let inpaintedFrameUrl: string | null = null;
  let generatedVideoUrl: string | null = null;

  /* ── Real pipeline: analyse → inpaint → video ── */
  if (input.frameDataUrl) {
    // 0. Analyse the scene for natural placement context
    let sceneDescription: string | null = null;
    const falKey = process.env.FAL_KEY;
    if (falKey) {
      sceneDescription = await analyzeScene(input.frameDataUrl, falKey);
    }

    // 1. Inpaint product onto the extracted frame
    inpaintedFrameUrl = await inpaintProductOnFrame({
      frameDataUrl: input.frameDataUrl,
      maskDataUrl: input.maskDataUrl,
      brand: input.brand,
      productDescription: input.productDescription,
      sceneDescription,
    });

    // 2. Turn the inpainted frame into a video clip
    if (inpaintedFrameUrl) {
      generatedVideoUrl = await generateVideoFromFrame({
        imageUrl: inpaintedFrameUrl,
        brand: input.brand,
        productDescription: input.productDescription,
      });
    }
  }

  /* ── Fallback: at least generate a product image for the bubble ── */
  let bubbleImageUrl = inpaintedFrameUrl;
  if (!bubbleImageUrl) {
    bubbleImageUrl = await generateProductImage(input.brand, input.productDescription);
  }

  const processedVideoUrl = generatedVideoUrl || input.sourceVideoUrl;

  const adSlot: AdSlot = {
    timestamp,
    productName: `${input.brand} Featured Product`,
    productImageUrl: bubbleImageUrl || input.productImageUrl || DEFAULT_PRODUCT_IMAGE,
    buyUrl: input.buyUrl || "https://stripe.com",
    placement: input.maskRegion
      ? { x: input.maskRegion.x + input.maskRegion.w / 2, y: input.maskRegion.y }
      : { x: 0.5, y: 0.4 },
  };

  const saveResult = await saveProcessedVideo({
    clerkUserId: userId,
    sourceVideoUrl: input.sourceVideoUrl,
    processedVideoUrl,
    adSlot,
    promptContext: `[${input.brand}] ${input.productDescription}`,
  });

  return {
    status: "ready",
    originalVideoUrl: input.sourceVideoUrl,
    aiClipUrl: generatedVideoUrl,
    inpaintedFrameUrl,
    processedVideoUrl,
    adSlot,
    insertAtTimestamp: timestamp,
    savedToSupabase: saveResult.savedToSupabase,
    saveError: "saveError" in saveResult ? saveResult.saveError : undefined,
  };
}
