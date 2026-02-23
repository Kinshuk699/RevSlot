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
};

export type ProcessVideoResult = {
  status: "ready";
  processedVideoUrl: string;
  inpaintedFrameUrl: string | null;
  adSlot: AdSlot;
  detectionTimestamp: number;
  savedToSupabase: boolean;
  saveError?: string;
};

/* ═══════════════════════════  Constants  ═══════════════════════════ */

const DEFAULT_TIMESTAMP = 3;
const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80";
const FAL_POLL_INTERVAL = 3_000;
const FAL_MAX_POLLS = 90; // 90 × 3 s = 4.5 min max wait

/* ═══════════ Step 1 — Inpaint product onto extracted frame ════════ */

async function inpaintProductOnFrame(input: {
  frameDataUrl: string;
  brand: string;
  productDescription: string;
}): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("[Fal] FAL_KEY missing — skipping inpainting");
    return null;
  }

  const product = input.productDescription
    ? `${input.productDescription} by ${input.brand}`
    : `a premium ${input.brand} product`;

  const prompt = [
    `A photorealistic ${product}, naturally placed in this exact scene,`,
    "perfectly matching the existing lighting, shadows, depth-of-field and color palette.",
    "Commercial product photography quality, 8 k, seamless integration.",
  ].join(" ");

  console.log("[Fal] Step 1 → Inpainting product onto frame …");

  try {
    const res = await fetch("https://fal.run/fal-ai/fast-sdxl-inpainting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({
        image_url: input.frameDataUrl,
        prompt,
        negative_prompt:
          "blurry, distorted, text, watermark, cartoon, low quality, unrealistic, floating, out of place",
        mask: { x: 0.35, y: 0.2, width: 0.3, height: 0.5 },
        num_inference_steps: 35,
        guidance_scale: 7.5,
        strength: 0.95,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[Fal] Inpaint error", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = (await res.json()) as { images?: { url?: string }[] };
    const url = data.images?.[0]?.url ?? null;
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

  const timestamp = DEFAULT_TIMESTAMP;
  let inpaintedFrameUrl: string | null = null;
  let generatedVideoUrl: string | null = null;

  /* ── Real pipeline: frame → inpaint → video ── */
  if (input.frameDataUrl) {
    // 1. Inpaint product onto the extracted frame
    inpaintedFrameUrl = await inpaintProductOnFrame({
      frameDataUrl: input.frameDataUrl,
      brand: input.brand,
      productDescription: input.productDescription,
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
    timestamp: generatedVideoUrl ? 2 : timestamp,
    productName: `${input.brand} Featured Product`,
    productImageUrl: bubbleImageUrl || input.productImageUrl || DEFAULT_PRODUCT_IMAGE,
    buyUrl: input.buyUrl || "https://stripe.com",
    placement: { x: 0.5, y: 0.4 },
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
    processedVideoUrl,
    inpaintedFrameUrl,
    adSlot,
    detectionTimestamp: timestamp,
    savedToSupabase: saveResult.savedToSupabase,
    saveError: "saveError" in saveResult ? saveResult.saveError : undefined,
  };
}
