"use server";

import { auth } from "@clerk/nextjs/server";
import type { AdSlot } from "@/components/VibePlayer";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

type ProcessVideoInput = {
  sourceVideoUrl: string;
  brand: string;
  productDescription: string;
  buyUrl?: string;
  productImageUrl?: string;
};

export type ProcessVideoResult = {
  status: "ready";
  processedVideoUrl: string;
  adSlot: AdSlot;
  detectionQuery: string;
  detectionTimestamp: number;
  savedToSupabase: boolean;
  saveError?: string;
};

type TwelveLabsResult = {
  timestamp: number;
  query: string;
};

const DEFAULT_FALLBACK_TIMESTAMP = 3;
const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80";

function clampTimestamp(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return DEFAULT_FALLBACK_TIMESTAMP;
  }

  return Math.max(0.5, value);
}

async function detectTimestampWithTwelveLabs(
  sourceVideoUrl: string,
  brand: string,
  productDescription: string,
): Promise<TwelveLabsResult> {
  const apiKey = process.env.TWELVE_LABS_API_KEY;
  const indexId = process.env.TWELVE_LABS_INDEX_ID;

  // Build a smart search query from the user's own product info
  const query = productDescription
    ? `${productDescription} ${brand}`.trim()
    : brand || "product";

  if (!apiKey || !indexId) {
    return { timestamp: DEFAULT_FALLBACK_TIMESTAMP, query };
  }

  try {
    const response = await fetch("https://api.twelvelabs.io/v1.3/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        index_id: indexId,
        query_text: query,
        page_limit: 1,
        search_options: ["visual", "conversation", "text_in_video"],
        video_url: sourceVideoUrl,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { timestamp: DEFAULT_FALLBACK_TIMESTAMP, query };
    }

    const payload = (await response.json()) as {
      data?: Array<Record<string, unknown>>;
    };

    const item = payload?.data?.[0] ?? {};
    const rawStart =
      item.start_time ?? item.start ?? item.start_sec ?? item.start_seconds ?? item.score_start;

    if (typeof rawStart === "number") {
      return { timestamp: clampTimestamp(rawStart), query };
    }

    if (typeof rawStart === "string") {
      return { timestamp: clampTimestamp(Number.parseFloat(rawStart)), query };
    }

    return { timestamp: DEFAULT_FALLBACK_TIMESTAMP, query };
  } catch {
    return { timestamp: DEFAULT_FALLBACK_TIMESTAMP, query };
  }
}

async function runFalInpainting(input: {
  sourceVideoUrl: string;
  brand: string;
  productDescription: string;
}): Promise<string> {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    return input.sourceVideoUrl;
  }

  // The inpainting model sees the surrounding pixels — it matches lighting
  // and perspective automatically. We only need to describe WHAT to place.
  const productPhrase = input.productDescription
    ? `${input.productDescription} by ${input.brand}`
    : `a premium ${input.brand} product`;

  const prompt = `A photorealistic ${productPhrase}, studio quality, 8k, seamlessly matching the surrounding lighting, shadows, and perspective. No text, no watermark.`;

  try {
    const response = await fetch("https://fal.run/fal-ai/fast-sdxl-inpainting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({
        image_url: input.sourceVideoUrl,
        prompt,
        mask: {
          x: 0.52,
          y: 0.58,
          width: 0.18,
          height: 0.28,
        },
        upscale: true,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return input.sourceVideoUrl;
    }

    const payload = (await response.json()) as {
      images?: Array<{ url?: string }>;
      image?: { url?: string };
      output?: { url?: string };
    };

    return (
      payload.images?.[0]?.url ?? payload.image?.url ?? payload.output?.url ?? input.sourceVideoUrl
    );
  } catch {
    return input.sourceVideoUrl;
  }
}

async function saveProcessedVideo(params: {
  clerkUserId: string;
  sourceVideoUrl: string;
  processedVideoUrl: string;
  adSlot: AdSlot;
  promptContext: string;
}) {
  const supabase = getSupabaseServiceRoleClient();

  const payload = {
    clerk_user_id: params.clerkUserId,
    source_video_url: params.sourceVideoUrl,
    processed_video_url: params.processedVideoUrl,
    ad_slot: params.adSlot,
    status: "ready",
    prompt_context: params.promptContext,
  };

  const { error } = await supabase.from("videos").insert(payload);

  if (error) {
    return { savedToSupabase: false, saveError: error.message };
  }

  return { savedToSupabase: true as const };
}

export async function processVideoAction(input: ProcessVideoInput): Promise<ProcessVideoResult> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("You must be signed in to process videos.");
  }

  if (!input.sourceVideoUrl) {
    throw new Error("Video URL is required.");
  }

  const detection = await detectTimestampWithTwelveLabs(
    input.sourceVideoUrl,
    input.brand,
    input.productDescription,
  );

  const processedVideoUrl = await runFalInpainting({
    sourceVideoUrl: input.sourceVideoUrl,
    brand: input.brand,
    productDescription: input.productDescription,
  });

  const adSlot: AdSlot = {
    timestamp: detection.timestamp,
    productName: `${input.brand} Featured Product`,
    productImageUrl: input.productImageUrl || DEFAULT_PRODUCT_IMAGE,
    buyUrl: input.buyUrl || "https://stripe.com",
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
    adSlot,
    detectionQuery: detection.query,
    detectionTimestamp: detection.timestamp,
    savedToSupabase: saveResult.savedToSupabase,
    saveError: "saveError" in saveResult ? saveResult.saveError : undefined,
  };
}
