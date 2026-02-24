"use server";

import { auth } from "@clerk/nextjs/server";
import type { AdSlot } from "@/components/VibePlayer";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
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

  // Add the text prompt — SCENE EDITING instruction for Flux Kontext Max
  imageContent.push({
    type: "text",
    text: `You are an award-winning creative director for product placement in film and TV — think Coca-Cola in Suits, Ray-Ban in Top Gun, Aston Martin in James Bond.
You are looking at ${frameSamples.length} frames sampled from a video, shown above in order.

${frameList}

PRODUCT TO PLACE:
- Brand: ${brand}
- Product: ${productDescription}
${referenceVisualSpec ? `- Visual appearance (from reference photo): ${referenceVisualSpec}` : ""}

YOUR JOB: Pick the SINGLE BEST frame for natural product placement and write a precise EDITING INSTRUCTION that will be sent to an AI image editor to GENERATE the product INTO the scene.

HOW THE PIPELINE WORKS (important — read carefully):
1. You pick the best frame and write a detailed editing instruction
2. An AI image editor (Flux Kontext Max) receives the original frame + your instruction
3. The editor REGENERATES the frame with the product naturally integrated into the 3D scene
4. The product is CREATED FROM SCRATCH by the AI — it is NOT pasted, NOT composited, NOT overlaid
5. If the product is a well-known brand (Coca-Cola, Maggi, Nike, etc.), the AI already knows exactly what it looks like
6. The reference image is just for YOUR analysis — the generation model works from text alone

PLACEMENT STRATEGY — Think like a real VFX product placement director:
Your #1 PRIORITY is CHARACTER INTERACTION. The product should NOT just sit on a table — a person in the scene should be USING, HOLDING, or WEARING it.

- GOLD STANDARD (always try this first): A character physically interacting with the product:
  * Holding a can/bottle in their hand (Harvey Specter holding a Coca-Cola can in Suits)
  * Wearing headphones/glasses/accessories (Joey wearing Beats headphones)
  * Drinking from a bottle or can
  * Typing on a laptop, using a phone, holding a product mid-conversation
  * Reaching for or picking up the product
  Pick a frame where a character's hand is visible and relatively still — sitting at a desk, standing casually, mid-conversation. The AI will modify their hand/body to naturally hold/wear the product.

- FALLBACK (only if no person is visible or interaction is impossible): Product placed on a surface near a person
  * On the desk they are working at, on the counter they are cooking at
  * Next to their hand on a table, on a coffee table in front of them

- AVOID: Product floating in empty space, product on the floor, product far from any person
- The product must look like it was ALWAYS part of the original scene
- Prefer frames where someone is relatively still (sitting, standing, talking) — NOT fast action
- Consider the scene narrative: a kitchen scene means food/drinks, an office means tech/drinks, etc.

THE EDITING INSTRUCTION (inpaintingPrompt) IS THE MOST CRITICAL FIELD:
Write it as a direct command to an AI image editor. This is what actually controls the output quality.

FOR CHARACTER INTERACTION (preferred):
- "The person is holding a [product] in their right hand, gripping it casually mid-conversation"
- "The person is wearing [product] headphones over their ears, the brand logo visible on the side"
- "The person is drinking from a [product] can, tilting it slightly toward their lips"
- Describe exactly HOW the character interacts: which hand, grip style, body posture change
- The character's pose may change slightly to accommodate holding/wearing the product — that is fine and expected

FOR ALL PLACEMENTS:
- Be VERY SPECIFIC about position and interaction
- Describe the product accurately: brand name, type, packaging, distinctive colors/logo
- Specify lighting match: "lit by the same warm overhead lamp", "matching the cool blue office lighting"
- Specify perspective/angle: "viewed from the same slight downward angle as the camera"
- Specify scale: "at realistic proportional size relative to the person hand/the objects around it"
- State what NOT to change: "Keep the background, setting, and overall composition the same"
- 80-150 words. More detail = better result.

Return a JSON object with EXACTLY these fields:
{
  "chosenFrameIndex": 0,
  "chosenTimestamp": 0.0,
  "maskRegion": { "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0 },
  "sceneDescription": "Detailed description of the scene — environment, people (positions, actions), objects, surfaces, lighting direction and color temperature, mood. 2-3 sentences.",
  "placementRationale": "WHY you chose this frame and this specific placement strategy. How does the product naturally fit into this exact moment? What makes this placement feel authentic rather than forced? 2-3 sentences.",
  "inpaintingPrompt": "EDITING INSTRUCTION — the direct command for the AI image editor. See detailed instructions above. 80-150 words.",
  "videoMotionPrompt": "Prompt for image-to-video animation. This is CRITICAL — describe the character INTERACTING with the product: drinking from the can, adjusting the headphones, casually holding the bottle while talking, glancing at the phone screen, etc. The interaction should feel natural and effortless — like the character has been using this product their whole life. Also describe ambient scene motion (gentle camera drift, natural lighting). The product must remain clearly visible and recognizable throughout. 50-100 words.",
  "negativePrompt": "Comma-separated list of things to AVOID in both image and video generation."
}

RULES FOR maskRegion (normalised 0-1 coordinates, used for UI shopping overlay):
- x,y = approximate top-left corner of where the product appears in the frame
- w,h = approximate width and height of the product visual footprint
- This is used ONLY for positioning a subtle shopping UI element — it does NOT control the AI placement
- Estimate based on where you instructed the product to appear

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

/* ═══════ Phase 3+4 — AI Product Placement (Flux Kontext Max) ═════ */
/*
 * PURE GENERATIVE approach — no pasting, no compositing, no stickers.
 *
 * The AI image editor (Flux Kontext Max) receives:
 *   1. The original scene frame (untouched)
 *   2. A detailed text prompt from the Director describing exactly how
 *      to add the product into the scene
 *
 * The model REGENERATES the frame with the product naturally integrated —
 * correct perspective, lighting, shadows, 3D placement. The product is
 * created from scratch using the model's knowledge of real-world brands.
 *
 * The reference product image is used ONLY by GPT-4o Director for analysis.
 * It is never sent to the generation model.
 */

async function placeProductInScene(input: {
  frameDataUrl: string;
  frameWidth: number;
  frameHeight: number;
  editingPrompt: string;
}): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("[FluxKontext] FAL_KEY missing — cannot generate");
    return null;
  }

  fal.config({ credentials: falKey });
  console.log("[FluxKontext] Generating product placement with Flux Kontext Max …");
  console.log("[FluxKontext] Prompt:", input.editingPrompt.slice(0, 200));

  // Pick the closest supported aspect ratio for the frame
  const ar = input.frameWidth / input.frameHeight;
  const ratioOptions = [
    { key: "21:9" as const, val: 21 / 9 },
    { key: "16:9" as const, val: 16 / 9 },
    { key: "3:2" as const, val: 3 / 2 },
    { key: "4:3" as const, val: 4 / 3 },
    { key: "1:1" as const, val: 1 },
    { key: "3:4" as const, val: 3 / 4 },
    { key: "2:3" as const, val: 2 / 3 },
    { key: "9:16" as const, val: 9 / 16 },
    { key: "9:21" as const, val: 9 / 21 },
  ];
  let bestRatio = ratioOptions[1]; // default 16:9
  let bestDiff = Infinity;
  for (const r of ratioOptions) {
    const diff = Math.abs(r.val - ar);
    if (diff < bestDiff) { bestDiff = diff; bestRatio = r; }
  }
  console.log(`[FluxKontext] Frame ${input.frameWidth}×${input.frameHeight} → aspect_ratio: ${bestRatio.key}`);

  try {
    const result = await fal.subscribe("fal-ai/flux-pro/kontext/max", {
      input: {
        prompt: input.editingPrompt,
        image_url: input.frameDataUrl,
        aspect_ratio: bestRatio.key,
        output_format: "jpeg",
        safety_tolerance: "5",
      },
      pollInterval: 3000,
      timeout: 180_000, // 3 minute timeout
      onQueueUpdate: (update) => {
        console.log(`[FluxKontext] Queue: ${update.status}`);
      },
    });

    const data = result.data as { images?: Array<{ url?: string; width?: number; height?: number }> };
    const url = data?.images?.[0]?.url;
    if (url) {
      const w = data?.images?.[0]?.width;
      const h = data?.images?.[0]?.height;
      console.log(`[FluxKontext] ✓ Product placed naturally: ${w}×${h}`, url.slice(0, 100));
      return url;
    }

    console.warn("[FluxKontext] No image URL in response:", JSON.stringify(data).slice(0, 300));
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[FluxKontext] Error:", msg);
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
 * PIPELINE — Pure AI Generative Product Placement:
 *   Phase 1+2 → GPT-4o Vision analyses all frames, picks best moment,
 *               writes detailed EDITING INSTRUCTION for Flux Kontext Max
 *   Phase 3+4 → Flux Kontext Max receives the original frame + editing
 *               instruction → REGENERATES the frame with the product
 *               naturally integrated (correct perspective, lighting, shadows).
 *               The product is generated from scratch — NOT pasted/composited.
 *               Reference image is used ONLY by GPT-4o for product analysis.
 *   Phase 5   → Kling animates the AI-edited frame into video
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
    /* ── Phase 3+4: AI PRODUCT PLACEMENT (Flux Kontext Max) ── */
    // Build the editing prompt — Director's instruction OR fallback
    const editingPrompt = directorDecision?.inpaintingPrompt ??
      buildFallbackInpaintingPrompt(fallbackDesc, brand, input.productDescription);

    console.log("[Pipeline] Sending frame to Flux Kontext Max for AI product placement …");

    compositedFrameUrl = await placeProductInScene({
      frameDataUrl: chosenFrame.dataUrl,
      frameWidth: chosenFrame.width,
      frameHeight: chosenFrame.height,
      editingPrompt,
    });
    pipelineSteps.push(compositedFrameUrl ? "ai-placement-done" : "ai-placement-failed");

    /* ── Phase 5: VIDEO GENERATION ── */
    if (compositedFrameUrl) {
      const motionPrompt = directorDecision?.videoMotionPrompt ??
        `Smooth cinematic shot. The person in the scene is casually interacting with the ${input.productDescription} — holding it naturally, using it as part of their activity. Their motion is subtle and natural, as if they have been using this product their whole life. The ${input.productDescription} remains clearly visible and recognizable throughout. Gentle ambient motion, natural lighting shifts. Photorealistic, commercial quality.`;

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

/* ═══════ Fallback editing prompt builder ═══════════════════════════ */

function buildFallbackInpaintingPrompt(
  sceneDesc: string | null,
  brand: string,
  productDescription: string,
): string {
  const product = productDescription
    ? `${brand} ${productDescription}`
    : `a premium ${brand} product`;
  const scene = sceneDesc ? `In this scene: ${sceneDesc}. ` : "";
  return `${scene}Add a ${product} naturally into this scene. Place it on the most visible surface near any person in the frame — a table, counter, or desk. The product should be at realistic scale, matching the scene's lighting direction and color temperature. It should look like it was physically present when the photo was taken, with correct perspective and subtle shadows. Keep all other elements of the scene exactly as they are.`;
}
