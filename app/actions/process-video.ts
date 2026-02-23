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
  /** The composited/inpainted frame image URL */
  inpaintedFrameUrl: string | null;
  /** Legacy — kept for fallback; equals aiClipUrl or originalVideoUrl */
  processedVideoUrl: string;
  adSlot: AdSlot;
  /** The timestamp at which the AI clip should be inserted */
  insertAtTimestamp: number;
  /** Progress step the server finished on (for client logging) */
  pipelineSteps: string[];
  savedToSupabase: boolean;
  saveError?: string;
};

/* ═══════════════════════════  Constants  ═══════════════════════════ */

const DEFAULT_TIMESTAMP = 3;
const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80";
const FAL_POLL_INTERVAL = 5_000;
const FAL_MAX_POLLS = 120; // 120 × 5 s = 10 min max wait

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

/* ═══════ Step 1 — Get or generate a product image ═════════════════ */

async function getProductImage(input: {
  productImageUrl?: string;
  brand: string;
  productDescription: string;
}): Promise<string | null> {
  // If user provided a product image URL, use it directly
  if (input.productImageUrl && input.productImageUrl.startsWith("http")) {
    console.log("[Pipeline] Using user-provided product image:", input.productImageUrl.slice(0, 80));
    return input.productImageUrl;
  }

  // Otherwise generate one with flux/schnell
  return generateProductImage(input.brand, input.productDescription);
}

/* ═══════ Step 2 — Composite product onto frame + harmonize ════════ */

async function compositeAndHarmonize(input: {
  frameDataUrl: string;
  maskDataUrl?: string;
  productImageUrl: string;
  brand: string;
  productDescription: string;
  sceneDescription?: string | null;
  maskRegion: { x: number; y: number; w: number; h: number };
}): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("[Fal] FAL_KEY missing — skipping compositing");
    return null;
  }

  const product = input.productDescription
    ? `${input.productDescription} by ${input.brand}`
    : `a premium ${input.brand} product`;

  // Build a context-aware prompt focused on harmonizing the composited product
  const sceneContext = input.sceneDescription
    ? `Scene context: ${input.sceneDescription}. `
    : "";

  const prompt = [
    `${sceneContext}A photorealistic ${product} sitting naturally in this scene,`,
    "perfectly matching the existing lighting, shadows, perspective, and color temperature.",
    "The product looks like it belongs there, with natural reflections and contact shadows.",
    "Commercial product photography quality, 8k resolution, photorealistic.",
  ].join(" ");

  console.log("[Fal] Step 2 → Compositing product onto frame with harmonization …");

  // Use inpainting with the product image composited into the frame.
  // We use strength 0.65 — enough to blend lighting/shadows but
  // low enough that the actual product remains recognisable.
  const body: Record<string, unknown> = {
    model_name: "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
    image_url: input.frameDataUrl,
    prompt,
    negative_prompt:
      "blurry, distorted, text, watermark, cartoon, low quality, unrealistic, " +
      "different product, wrong product, no product, empty, " +
      "floating, flying, wrong perspective, unnatural shadows",
    num_inference_steps: 40,
    guidance_scale: 8.5,
    strength: 0.75,
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

    const data = (await res.json()) as { image?: { url?: string } };
    const url = data.image?.url ?? null;
    console.log("[Fal] Composited:", url ? "✓ " + url.slice(0, 80) : "✗ no image");
    return url;
  } catch (err) {
    console.error("[Fal] Composite exception:", err);
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

  const body = {
    image_url: input.imageUrl,
    prompt,
    duration: "5",
  };

  // ── Attempt 1: Synchronous endpoint (blocks until done, max ~5 min) ──
  console.log("[Fal] Step 2 → Trying synchronous image-to-video (Kling) …");
  try {
    const controller = new AbortController();
    const syncTimeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min

    const syncRes = await fetch(
      "https://fal.run/fal-ai/kling-video/v1/standard/image-to-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${falKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      },
    );
    clearTimeout(syncTimeout);

    if (syncRes.ok) {
      const result = (await syncRes.json()) as { video?: { url?: string } };
      if (result.video?.url) {
        console.log("[Fal] Sync video ✓:", result.video.url.slice(0, 100));
        return result.video.url;
      }
      console.warn("[Fal] Sync returned OK but no video URL:", JSON.stringify(result).slice(0, 300));
    } else {
      const errText = await syncRes.text().catch(() => "");
      console.warn("[Fal] Sync endpoint failed:", syncRes.status, errText.slice(0, 300));
    }
  } catch (syncErr) {
    if (syncErr instanceof DOMException && syncErr.name === "AbortError") {
      console.warn("[Fal] Sync endpoint timed out after 5 min — trying queue …");
    } else {
      console.warn("[Fal] Sync exception:", syncErr);
    }
  }

  // ── Attempt 2: Queue endpoint (submit + poll) ──
  console.log("[Fal] Step 2b → Falling back to queue-based Kling …");
  try {
    const submitRes = await fetch(
      "https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${falKey}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!submitRes.ok) {
      console.error("[Fal] Queue submit error", submitRes.status, await submitRes.text().catch(() => ""));
      return null;
    }

    const { request_id } = (await submitRes.json()) as { request_id: string };
    console.log("[Fal] Queued request:", request_id);

    // ── Poll until done ──
    for (let i = 0; i < FAL_MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, FAL_POLL_INTERVAL));

      try {
        const statusRes = await fetch(
          `https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video/requests/${request_id}/status`,
          { headers: { Authorization: `Key ${falKey}` } },
        );

        if (!statusRes.ok) {
          const errBody = await statusRes.text().catch(() => "");
          console.warn(`[Fal] Poll ${i + 1}: HTTP ${statusRes.status} — ${errBody.slice(0, 200)}`);
          continue;
        }

        const statusData = (await statusRes.json()) as Record<string, unknown>;
        const status = (statusData.status as string) ?? "UNKNOWN";

        // Log frequently so we can see progress
        if (i % 3 === 0 || status === "COMPLETED" || status === "FAILED") {
          console.log(`[Fal] Poll ${i + 1}/${FAL_MAX_POLLS}: ${status}`);
        }

        if (status === "COMPLETED") {
          const resultRes = await fetch(
            `https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video/requests/${request_id}`,
            { headers: { Authorization: `Key ${falKey}` } },
          );
          if (!resultRes.ok) {
            console.error("[Fal] Result fetch failed:", resultRes.status);
            return null;
          }

          const result = (await resultRes.json()) as { video?: { url?: string } };
          console.log("[Fal] Video:", result.video?.url ? "✓ " + result.video.url.slice(0, 100) : "✗ no url");
          return result.video?.url ?? null;
        }

        if (status === "FAILED") {
          console.error("[Fal] Video generation FAILED:", JSON.stringify(statusData));
          return null;
        }
      } catch (pollErr) {
        console.warn(`[Fal] Poll ${i + 1} exception:`, pollErr);
      }
    }

    console.error("[Fal] Video generation timed out after", FAL_MAX_POLLS * FAL_POLL_INTERVAL / 1000, "s");
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
  const maskRegion = input.maskRegion ?? { x: 0.35, y: 0.2, w: 0.3, h: 0.5 };
  let compositedFrameUrl: string | null = null;
  let generatedVideoUrl: string | null = null;
  const pipelineSteps: string[] = [];

  /* ── New pipeline: analyse → get product image → composite + harmonize → video ── */
  if (input.frameDataUrl) {
    const falKey = process.env.FAL_KEY;

    // Step 0: Analyse the scene
    let sceneDescription: string | null = null;
    if (falKey) {
      sceneDescription = await analyzeScene(input.frameDataUrl, falKey);
      pipelineSteps.push(sceneDescription ? "scene-analysed" : "scene-analysis-skipped");
    }

    // Step 1: Get a product image (user-provided or AI-generated)
    const productImageUrl = await getProductImage({
      productImageUrl: input.productImageUrl,
      brand: input.brand,
      productDescription: input.productDescription,
    });
    pipelineSteps.push(productImageUrl ? "product-image-ready" : "product-image-failed");
    console.log("[Pipeline] Product image:", productImageUrl ? "✓" : "✗");

    // Step 2: Composite the product onto the frame + harmonize with inpainting
    compositedFrameUrl = await compositeAndHarmonize({
      frameDataUrl: input.frameDataUrl,
      maskDataUrl: input.maskDataUrl,
      productImageUrl: productImageUrl || "",
      brand: input.brand,
      productDescription: input.productDescription,
      sceneDescription,
      maskRegion,
    });
    pipelineSteps.push(compositedFrameUrl ? "composite-done" : "composite-failed");

    // Step 3: Turn the composited frame into a video clip
    if (compositedFrameUrl) {
      generatedVideoUrl = await generateVideoFromFrame({
        imageUrl: compositedFrameUrl,
        brand: input.brand,
        productDescription: input.productDescription,
      });
      pipelineSteps.push(generatedVideoUrl ? "video-generated" : "video-failed");
    }
  }

  /* ── Fallback: at least generate a product image for the bubble ── */
  let bubbleImageUrl = compositedFrameUrl;
  if (!bubbleImageUrl) {
    bubbleImageUrl = await generateProductImage(input.brand, input.productDescription);
  }

  const processedVideoUrl = generatedVideoUrl || input.sourceVideoUrl;

  const adSlot: AdSlot = {
    timestamp,
    productName: `${input.brand} Featured Product`,
    productImageUrl: bubbleImageUrl || input.productImageUrl || DEFAULT_PRODUCT_IMAGE,
    buyUrl: input.buyUrl || "https://stripe.com",
    placement: { x: maskRegion.x + maskRegion.w / 2, y: maskRegion.y },
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
    inpaintedFrameUrl: compositedFrameUrl,
    processedVideoUrl,
    adSlot,
    insertAtTimestamp: timestamp,
    pipelineSteps,
    savedToSupabase: saveResult.savedToSupabase,
    saveError: "saveError" in saveResult ? saveResult.saveError : undefined,
  };
}
