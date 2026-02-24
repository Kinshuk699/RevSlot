"use server";

import { auth } from "@clerk/nextjs/server";
import type { AdSlot } from "@/components/VibePlayer";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { deflateSync } from "zlib";
import { fal } from "@fal-ai/client";

/* ═══════════════════════════  Types  ═══════════════════════════════ */

/** A single sampled frame from the video (extracted client-side) */
type FrameSample = {
  dataUrl: string;
  timestamp: number;
  width: number;
  height: number;
};

type ProcessVideoInput = {
  sourceVideoUrl: string;
  brand?: string;
  productDescription: string;
  buyUrl?: string;
  productImageUrl: string;
  /** Multiple frames sampled across the video for the AI Director to choose from */
  frameSamples?: FrameSample[];
};

/** The AI Director's full decision — placement, creative direction, everything */
export type DirectorDecision = {
  /** Which frame index (0-based) the Director chose */
  chosenFrameIndex: number;
  /** The timestamp (seconds) of the chosen frame */
  chosenTimestamp: number;
  /** Where to place the product (normalised 0-1) */
  maskRegion: { x: number; y: number; w: number; h: number };
  /** Scene analysis */
  sceneDescription: string;
  /** Why this moment + position was chosen */
  placementRationale: string;
  /** Detailed prompt for SDXL inpainting */
  inpaintingPrompt: string;
  /** Prompt for Kling image-to-video */
  videoMotionPrompt: string;
  /** Things to avoid in generation */
  negativePrompt: string;
};

export type ProcessVideoResult = {
  status: "ready";
  originalVideoUrl: string;
  aiClipUrl: string | null;
  inpaintedFrameUrl: string | null;
  processedVideoUrl: string;
  adSlot: AdSlot;
  insertAtTimestamp: number;
  pipelineSteps: string[];
  savedToSupabase: boolean;
  saveError?: string;
  /** The AI Director's full decision (shown in UI) */
  directorDecision?: DirectorDecision | null;
};

/* ═══════════════════════════  Constants  ═══════════════════════════ */

const DEFAULT_TIMESTAMP = 3;
const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80";

/* ═══════════════  OpenAI helper  ══════════════════════════════════ */

function getOpenAIKey(): string | null {
  // Support both common env var casings
  return process.env.OPENAI_API_KEY || process.env.OpenAI_API_KEY || null;
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>;
};

async function callOpenAI(
  messages: ChatMessage[],
  config?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
): Promise<string | null> {
  const key = getOpenAIKey();
  if (!key) {
    console.warn("[OpenAI] No API key found (checked OPENAI_API_KEY and OpenAI_API_KEY)");
    return null;
  }

  try {
    const body: Record<string, unknown> = {
      model: "gpt-4o",
      messages,
      temperature: config?.temperature ?? 0.4,
      max_tokens: config?.maxTokens ?? 2000,
    };
    if (config?.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.warn("[OpenAI]", res.status, err.slice(0, 400));
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn("[OpenAI] Exception:", err);
    return null;
  }
}

function parseJsonFromLLM<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/* ═══════ Phase 1+2 — AI Director (GPT-4o Vision) ═════════════════ */
/*
 * ONE call does EVERYTHING:
 * - Analyses all sampled frames from the video
 * - Picks the BEST moment for product placement
 * - Decides WHERE in the frame to place it
 * - Writes specific inpainting + video motion prompts
 *
 * This replaces the old Gemini video analysis + separate creative direction.
 */
async function runAIDirector(
  frameSamples: FrameSample[],
  brand: string,
  productDescription: string,
  referenceVisualSpec?: string,
): Promise<DirectorDecision | null> {
  if (!getOpenAIKey()) {
    console.log("[Director] No OpenAI key — skipping AI direction");
    return null;
  }

  console.log(`[Director] Analysing ${frameSamples.length} frames with GPT-4o …`);

  // Build the multi-image message
  const imageContent: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> = [];

  // Add each frame as an image
  for (let i = 0; i < frameSamples.length; i++) {
    imageContent.push({
      type: "image_url",
      image_url: {
        url: frameSamples[i].dataUrl,
        detail: "low", // cheaper + faster, good enough for scene analysis
      },
    });
  }

  // Build the timestamp reference
  const frameList = frameSamples
    .map((f, i) => `  Frame ${i}: timestamp ${f.timestamp.toFixed(1)}s`)
    .join("\n");

  // Add the text prompt
  imageContent.push({
    type: "text",
    text: `You are an award-winning creative director for product placement in film and TV.
You are looking at ${frameSamples.length} frames sampled from a video, shown above in order.

${frameList}

PRODUCT TO PLACE:
- Brand: ${brand}
- Product: ${productDescription}
${referenceVisualSpec ? `- Reference visual specification: ${referenceVisualSpec}` : ""}

YOUR JOB: Pick the SINGLE BEST frame for natural product placement and create the full creative direction.

HOW THE PIPELINE WORKS: An AI model (Gemini) will look at your chosen frame AND the actual product reference image, then REGENERATE the frame with the product seamlessly placed into it — matching lighting, shadows, perspective, and scale automatically. Think of it like a VFX artist adding the product in post-production.

Think like a Hollywood ad executive:
- Which frame has a natural surface, empty space, or logical place for this product?
- Avoid frames where hands/faces/action would be obstructed
- Prefer moments with stable composition (less motion blur)
- Consider what surface the product will sit on — tables, counters, desks, shelves are ideal
- The product should feel like it was ALWAYS in the scene during filming

Return a JSON object with EXACTLY these fields:
{
  "chosenFrameIndex": 0,
  "chosenTimestamp": 0.0,
  "maskRegion": { "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0 },
  "sceneDescription": "What is happening in this video — environment, objects, surfaces, lighting, mood. 2-3 sentences.",
  "placementRationale": "WHY you chose this exact frame and position. What surface does it sit on? How does the lighting work? 2-3 sentences.",
  "inpaintingPrompt": "Detailed instruction for an AI model that will place the product into the scene. Describe EXACTLY: where in the frame the product should appear, what surface it sits on, the lighting direction and color temperature, shadows it should cast, its orientation/angle, and how it relates to nearby objects. Be very specific about the location using references like 'on the wooden desk to the left of the laptop' or 'on the kitchen counter next to the spice rack'. 60-150 words.",
  "videoMotionPrompt": "Prompt for image-to-video AI. Describe subtle ambient motion matching the original footage. The placed product MUST remain completely stationary, sharp, and clearly visible throughout — it is a real physical object in the scene. Any camera sway should be gentle. 30-80 words.",
  "negativePrompt": "Comma-separated list of things to AVOID: wrong lighting, floating, wrong scale, product moving or morphing, product disappearing, blur on product, etc."
}

RULES FOR maskRegion (normalised 0-1 coordinates):
- x,y = top-left corner of the approximate placement area
- w,h = width and height of the area where the product should appear
- The box should be on a visible SURFACE (table, desk, floor, shelf, counter)
- Size should be realistic for the product at its apparent distance from camera
- Typical product placement: w=0.08-0.20, h=0.10-0.30

Return ONLY valid JSON. No markdown fences.`,
  });

  const raw = await callOpenAI(
    [
      {
        role: "system",
        content: "You are a professional product placement creative director. Always respond with valid JSON only.",
      },
      { role: "user", content: imageContent },
    ],
    { temperature: 0.4, maxTokens: 1500, jsonMode: true },
  );

  if (!raw) return null;

  const decision = parseJsonFromLLM<DirectorDecision>(raw);
  if (decision?.inpaintingPrompt && decision?.videoMotionPrompt) {
    // Validate frame index
    if (decision.chosenFrameIndex < 0 || decision.chosenFrameIndex >= frameSamples.length) {
      decision.chosenFrameIndex = 0;
    }
    decision.chosenTimestamp = frameSamples[decision.chosenFrameIndex].timestamp;

    console.log("[Director] ✓ Chose frame", decision.chosenFrameIndex, "at", decision.chosenTimestamp.toFixed(1) + "s");
    console.log("[Director] Rationale:", decision.placementRationale);
    console.log("[Director] Region:", JSON.stringify(decision.maskRegion));
    return decision;
  }

  console.warn("[Director] Failed to parse GPT-4o response:", raw.slice(0, 200));
  return null;
}

async function analyzeReferenceProductImage(
  productImageUrl: string,
  productDescription: string,
): Promise<string | null> {
  if (!getOpenAIKey()) return null;

  const raw = await callOpenAI(
    [
      {
        role: "system",
        content: "You are a product visual analyst. Return concise, objective visual descriptors.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Analyze this reference product image for image generation. Return 1 concise paragraph (max 80 words) describing exact packaging geometry, colors, logo/label placement, materials, finish (matte/glossy), and recognizable brand marks. Avoid guessing hidden details. Product context: " +
              productDescription,
          },
          {
            type: "image_url",
            image_url: {
              url: productImageUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    { temperature: 0.2, maxTokens: 250 },
  );

  return raw?.trim() || null;
}

/* ═══════ Phase 3 — Remove product background (BiRefNet) ═════════ */

async function removeProductBackground(imageUrl: string): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("[BiRefNet] FAL_KEY missing — skipping background removal");
    return null;
  }

  fal.config({ credentials: falKey });
  console.log("[BiRefNet] Removing product background …");

  try {
    const result = await fal.run("fal-ai/birefnet", {
      input: {
        image_url: imageUrl,
        model: "General Use (Light)",
        output_format: "png",
      },
    });

    const data = result.data as { image?: { url?: string } };
    const url = data?.image?.url;
    if (url) {
      console.log("[BiRefNet] ✓ Background removed:", url.slice(0, 80));
      return url;
    }

    console.warn("[BiRefNet] No image URL in response");
    return null;
  } catch (err) {
    console.error("[BiRefNet] Error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/* ═══════ Phase 4 — AI Product Placement (Gemini via Nano Banana) ═══ */
/*
 * Uses fal-ai/nano-banana-pro/edit — a Gemini 3 Pro-powered multi-reference
 * image editor. We pass TWO images:
 *   Image 1: The video frame (the scene)
 *   Image 2: The product cutout (background removed)
 * + a detailed text prompt telling Gemini exactly where and how to place the
 *   product into the scene. Gemini understands depth, lighting, perspective,
 *   and generates the product as if it was always part of the scene.
 */
async function placeProductInScene(input: {
  frameDataUrl: string;
  productCutoutUrl: string;
  placementPrompt: string;
  productDescription: string;
  referenceVisualSpec?: string | null;
}): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("[Placement] FAL_KEY missing");
    return null;
  }

  fal.config({ credentials: falKey });

  // Build the placement instruction
  const visualRef = input.referenceVisualSpec
    ? `\nThe product looks exactly like this: ${input.referenceVisualSpec}`
    : "";

  const prompt = `You are a professional VFX compositor. Your job is to seamlessly add a product into a scene.

Image 1 is the original scene (a video frame).
Image 2 is the product to place (with transparent background).

INSTRUCTION: Place the product from Image 2 naturally into the scene from Image 1.
${input.placementPrompt}
${visualRef}

CRITICAL RULES:
- The product MUST look like it was physically present when the scene was filmed
- Match the scene's exact lighting direction, color temperature, and ambient light
- Add realistic shadows beneath/behind the product matching the scene's light source
- The product's perspective and scale must match the scene's depth and camera angle
- Preserve the product's branding, logos, text, and colors EXACTLY — do not alter them
- The rest of the scene must remain COMPLETELY UNCHANGED — same background, same objects, same people
- The result should look like a professional photograph, not a photoshop job`;

  console.log("[Placement] Generating product placement with Gemini (nano-banana-pro) …");
  console.log("[Placement] Prompt:", prompt.slice(0, 200));

  try {
    const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
      input: {
        prompt,
        image_urls: [input.frameDataUrl, input.productCutoutUrl],
        num_images: 1,
        resolution: "1K",
        output_format: "jpeg",
      },
      pollInterval: 3000,
      timeout: 180_000, // 3 minute timeout
      onQueueUpdate: (update) => {
        console.log(`[Placement] Queue: ${update.status}`);
      },
    });

    // nano-banana-pro returns { images: [{ url, ... }] }
    const data = result.data as { images?: Array<{ url?: string }> };
    const url = data?.images?.[0]?.url;
    if (url) {
      console.log("[Placement] ✓ Product placed in scene:", url.slice(0, 100));
      return url;
    }

    console.warn("[Placement] No image URL in response:", JSON.stringify(data).slice(0, 300));
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Placement] Error:", msg);
    return null;
  }
}

/* ═══════ Fallback — LLaVA frame analysis (when OpenAI unavailable) */

async function analyzeSceneFallback(
  frameDataUrl: string,
  falKey: string,
): Promise<string | null> {
  console.log("[Fal] Fallback → Analysing single frame with LLaVA …");
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
          "Describe this image in detail. Focus on: the setting/environment, " +
          "key objects and surfaces visible, lighting conditions, and any " +
          "empty surfaces where a product could naturally be placed.",
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { output?: string; result?: string };
    return data.output ?? data.result ?? null;
  } catch {
    return null;
  }
}

/* ═══════ Phase 4 — Composite + harmonize (Director's prompts) ═════ */

async function compositeAndHarmonize(input: {
  frameDataUrl: string;
  maskDataUrl: string;
  creativeDirection: { inpaintingPrompt: string; negativePrompt: string };
}): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("[Fal] FAL_KEY missing — skipping compositing");
    return null;
  }

  console.log("[Fal] Phase 4 → Compositing with Director's guidance …");
  console.log("[Fal] Prompt:", input.creativeDirection.inpaintingPrompt.slice(0, 120));

  const body: Record<string, unknown> = {
    model_name: "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
    image_url: input.frameDataUrl,
    mask_url: input.maskDataUrl,
    prompt: input.creativeDirection.inpaintingPrompt,
    negative_prompt: input.creativeDirection.negativePrompt,
    num_inference_steps: 40,
    guidance_scale: 8.5,
    strength: 0.75,
  };

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

/* ═══════ Phase 5 — Animate frame → video (Director's motion) ══════ */

async function generateVideoFromFrame(input: {
  imageUrl: string;
  motionPrompt: string;
}): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  // Configure the fal client with our API key
  fal.config({ credentials: falKey });

  console.log("[Fal] Phase 5 → Generating video with Kling (fal.subscribe) …");
  console.log("[Fal] Motion prompt:", input.motionPrompt.slice(0, 120));

  try {
    const result = await fal.subscribe(
      "fal-ai/kling-video/v1/standard/image-to-video",
      {
        input: {
          image_url: input.imageUrl,
          prompt: input.motionPrompt,
          duration: "5",
        },
        logs: true,
        pollInterval: 5000,
        timeout: 480_000, // 8 minute hard timeout
        onQueueUpdate: (update) => {
          console.log(`[Fal] Queue: ${update.status}${
            "position" in update ? ` (pos ${(update as Record<string, unknown>).position})` : ""
          }`);
        },
      },
    );

    const data = result.data as { video?: { url?: string } };
    if (data?.video?.url) {
      console.log("[Fal] Video ✓:", data.video.url.slice(0, 100));
      return data.video.url;
    }

    console.warn("[Fal] Subscribe completed but no video URL:", JSON.stringify(data).slice(0, 300));
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Fal] Video generation error:", msg);
    // Re-throw with a user-friendly message so UI can display it
    throw new Error(`Video generation failed: ${msg.slice(0, 200)}`);
  }
}

/* ═══════ Mask generation (server-side via base64 canvas trick) ═════ */
/*
 * Generates a mask PNG data URL with a white rectangle on a black canvas.
 * This runs server-side — no DOM Canvas needed (uses raw PNG bytes).
 */
function generateMaskPng(
  width: number,
  height: number,
  region: { x: number; y: number; w: number; h: number },
): string {
  // Build a simple uncompressed PNG with raw RGBA pixels
  const w = Math.min(width, 512);
  const h = Math.min(height, 512);

  const rx = Math.round(region.x * w);
  const ry = Math.round(region.y * h);
  const rw = Math.round(region.w * w);
  const rh = Math.round(region.h * h);

  // Create raw pixel buffer (RGBA)
  const pixels = Buffer.alloc(w * h * 4, 0); // all black, alpha=0

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const idx = (py * w + px) * 4;
      if (px >= rx && px < rx + rw && py >= ry && py < ry + rh) {
        // White (inpaint area)
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;
      } else {
        // Black (keep area)
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      }
    }
  }

  // Build PNG file manually (uncompressed IDAT with zlib stored blocks)

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Add filter bytes (0 = none) before each row
  const rawData = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    rawData[y * (1 + w * 4)] = 0; // filter byte
    pixels.copy(rawData, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }

  const compressed = deflateSync(rawData);

  // Build chunks
  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([len, typeB, data, crc]);
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // CRC table
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  return `data:image/png;base64,${png.toString("base64")}`;
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

/* ═══════════════  Main server action  ═════════════════════════════ */
/*
 * PIPELINE — Director + Gemini-powered Product Placement:
 *   Phase 1+2 → GPT-4o Vision analyses all frames, picks best moment,
 *               decides placement region, writes creative direction
 *   Phase 3   → BiRefNet removes product image background → transparent cutout
 *   Phase 4   → Gemini (nano-banana-pro/edit) sees the scene + product cutout
 *               and GENERATES the product seamlessly into the scene with correct
 *               lighting, shadows, perspective — like real VFX
 *   Phase 5   → Kling animates the composited frame into video
 *   Phase 6   → Splice into original
 */
export async function processVideoAction(
  input: ProcessVideoInput,
): Promise<ProcessVideoResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  if (!input.sourceVideoUrl) throw new Error("Video URL is required.");
  if (!input.productDescription?.trim()) {
    throw new Error("Product description is required — the AI Director needs to know what to place.");
  }
  if (!input.productImageUrl?.trim()) {
    throw new Error("Reference product image is required for exact visual fidelity.");
  }

  let compositedFrameUrl: string | null = null;
  let generatedVideoUrl: string | null = null;
  let directorDecision: DirectorDecision | null = null;
  const pipelineSteps: string[] = [];
  const falKey = process.env.FAL_KEY;

  // Extract brand from description if not provided separately
  const brand = input.brand || "";
  const referenceVisualSpec = await analyzeReferenceProductImage(
    input.productImageUrl,
    input.productDescription,
  );
  pipelineSteps.push(referenceVisualSpec ? "reference-image-analyzed" : "reference-analysis-failed");

  const hasFrames = input.frameSamples && input.frameSamples.length > 0;

  /* ── Phase 1+2: AI DIRECTOR (GPT-4o Vision) ── */
  if (hasFrames) {
    directorDecision = await runAIDirector(
      input.frameSamples!,
      brand,
      input.productDescription,
      referenceVisualSpec ?? undefined,
    );
    pipelineSteps.push(directorDecision ? "director-decided" : "director-failed");

    if (directorDecision) {
      console.log("[Pipeline] Director chose frame", directorDecision.chosenFrameIndex,
        "at", directorDecision.chosenTimestamp.toFixed(1) + "s");
    }
  }

  // Fallback: LLaVA on first frame if GPT-4o unavailable
  let fallbackDesc: string | null = null;
  if (!directorDecision && hasFrames && falKey) {
    fallbackDesc = await analyzeSceneFallback(input.frameSamples![0].dataUrl, falKey);
    pipelineSteps.push(fallbackDesc ? "llava-fallback" : "llava-failed");
  }

  // Determine which frame and region to use
  const chosenFrame = directorDecision && hasFrames
    ? input.frameSamples![directorDecision.chosenFrameIndex]
    : hasFrames
      ? input.frameSamples![0]
      : null;

  const chosenTimestamp = directorDecision?.chosenTimestamp ?? DEFAULT_TIMESTAMP;
  const maskRegion = directorDecision?.maskRegion ?? { x: 0.35, y: 0.2, w: 0.3, h: 0.5 };

  if (chosenFrame) {
    /* ── Phase 3: REMOVE PRODUCT BACKGROUND (BiRefNet) ── */
    const productCutoutUrl = await removeProductBackground(input.productImageUrl);
    pipelineSteps.push(productCutoutUrl ? "bg-removed" : "bg-removal-failed");

    /* ── Phase 4: AI PRODUCT PLACEMENT (Gemini via nano-banana-pro) ── */
    const productImgForPlacement = productCutoutUrl || input.productImageUrl;

    // Build the placement prompt from Director's analysis or fallback
    const placementPrompt = directorDecision?.inpaintingPrompt ??
      `Place the ${input.productDescription} naturally on a visible surface in this scene. ` +
      `It should look like it was always there — match lighting, shadows, perspective, and scale.`;

    compositedFrameUrl = await placeProductInScene({
      frameDataUrl: chosenFrame.dataUrl,
      productCutoutUrl: productImgForPlacement,
      placementPrompt,
      productDescription: input.productDescription,
      referenceVisualSpec: referenceVisualSpec,
    });
    pipelineSteps.push(compositedFrameUrl ? "placement-done" : "placement-failed");

    // Fallback: SDXL inpainting if Gemini placement failed
    if (!compositedFrameUrl) {
      console.warn("[Pipeline] Gemini placement failed — falling back to SDXL inpainting");
      const maskDataUrl = generateMaskPng(chosenFrame.width, chosenFrame.height, maskRegion);
      const inpaintingPrompt = directorDecision?.inpaintingPrompt ??
        buildFallbackInpaintingPrompt(fallbackDesc, brand, input.productDescription);
      const fidelityPrompt = referenceVisualSpec
        ? `${inpaintingPrompt}\n\nMANDATORY VISUAL FIDELITY: match this exact reference product appearance — ${referenceVisualSpec}`
        : inpaintingPrompt;
      const negativePrompt = directorDecision?.negativePrompt ??
        "blurry, distorted, watermark, cartoon, low quality, floating, wrong perspective";
      compositedFrameUrl = await compositeAndHarmonize({
        frameDataUrl: chosenFrame.dataUrl,
        maskDataUrl,
        creativeDirection: { inpaintingPrompt: fidelityPrompt, negativePrompt },
      });
      pipelineSteps.push(compositedFrameUrl ? "composite-fallback-done" : "composite-fallback-failed");
    }

    /* ── Phase 5: VIDEO GENERATION ── */
    if (compositedFrameUrl) {
      const motionPrompt = directorDecision?.videoMotionPrompt ??
        `Smooth cinematic shot. The ${input.productDescription} sits stationary and clearly visible on a surface in the scene. Subtle ambient motion around it — gentle camera drift, natural lighting shifts. The product MUST remain sharp, stable, and unmoved throughout. Photorealistic, commercial quality.`;

      try {
        generatedVideoUrl = await generateVideoFromFrame({
          imageUrl: compositedFrameUrl,
          motionPrompt,
        });
      } catch (videoErr) {
        console.error("[Pipeline] Video generation threw:", videoErr);
        generatedVideoUrl = null;
      }
      pipelineSteps.push(generatedVideoUrl ? "video-generated" : "video-failed");
    }
  }

  const processedVideoUrl = generatedVideoUrl || input.sourceVideoUrl;

  // Extract a short product name from description for the CTA bar
  const productName = input.productDescription.split(/[—\-–.,;]/)[0].trim().slice(0, 40);

  const adSlot: AdSlot = {
    timestamp: chosenTimestamp,
    productName: productName || "Featured Product",
    productImageUrl: DEFAULT_PRODUCT_IMAGE,
    buyUrl: input.buyUrl || "https://stripe.com",
    placement: { x: maskRegion.x + maskRegion.w / 2, y: maskRegion.y },
  };

  const saveResult = await saveProcessedVideo({
    clerkUserId: userId,
    sourceVideoUrl: input.sourceVideoUrl,
    processedVideoUrl,
    adSlot,
    promptContext: `${input.productDescription}`,
  });

  return {
    status: "ready",
    originalVideoUrl: input.sourceVideoUrl,
    aiClipUrl: generatedVideoUrl,
    inpaintedFrameUrl: compositedFrameUrl,
    processedVideoUrl,
    adSlot,
    insertAtTimestamp: chosenTimestamp,
    pipelineSteps,
    savedToSupabase: saveResult.savedToSupabase,
    saveError: "saveError" in saveResult ? saveResult.saveError : undefined,
    directorDecision,
  };
}

/* ═══════ Fallback inpainting prompt builder ═══════════════════════ */

function buildFallbackInpaintingPrompt(
  sceneDesc: string | null,
  brand: string,
  productDescription: string,
): string {
  const product = productDescription
    ? `${productDescription} by ${brand}`
    : `a premium ${brand} product`;
  const scene = sceneDesc ? `Scene: ${sceneDesc}. ` : "";
  return `${scene}A photorealistic ${product} placed naturally in this scene, matching the lighting, shadows, perspective, and color temperature perfectly. The product looks like it was always there. Commercial photography quality, 8k.`;
}
