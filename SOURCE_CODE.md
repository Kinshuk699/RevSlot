# RevSlot - Full Source Code

This file contains every TypeScript/TSX source file in the project, formatted as readable markdown.
The original .ts/.tsx files are also included in this zip for completeness.

---

## `middleware.ts`

```tsx
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/create(.*)", "/pricing(.*)", "/api/checkout(.*)", "/api/upload(.*)"]);
const isPublicRoute = createRouteMatcher(["/api/webhook(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

---

## `next.config.ts`

```tsx
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

---

## `lib/supabase.ts`

```tsx
import "server-only";

import { createClient } from "@supabase/supabase-js";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function getSupabaseServiceRoleClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
```

---

## `lib/stripe.ts`

```tsx
import Stripe from "stripe";

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY env var");
  return key;
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeSecretKey(), {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
}
```

---

## `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Toaster } from "sonner";
import { syncUserProfile } from "@/app/actions/sync-user";
import { AuthNav } from "@/components/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RevSlot — AI-Powered Visual Commerce",
  description:
    "Turn any video into a shoppable storefront. RevSlot\u2019s AI Director finds the perfect frame, seamlessly places your product, and generates a click-to-buy overlay — no editing skills needed.",
  openGraph: {
    title: "RevSlot — AI-Powered Visual Commerce",
    description:
      "Turn any video into a shoppable storefront with generative AI product placement.",
    url: "https://revslot.onrender.com",
    siteName: "RevSlot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RevSlot — AI-Powered Visual Commerce",
    description:
      "Turn any video into a shoppable storefront with generative AI product placement.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const { userId } = await auth();

  if (userId) {
    try {
      await syncUserProfile(userId);
    } catch (error) {
      console.error("Failed to sync user profile", error);
    }
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {publishableKey ? (
          <ClerkProvider
            publishableKey={publishableKey}
            signInFallbackRedirectUrl="/create"
            signUpFallbackRedirectUrl="/create"
          >
            <AuthNav />
            {children}
            <Toaster richColors closeButton />
          </ClerkProvider>
        ) : (
          <>
            <AuthNav />
            {children}
            <Toaster richColors closeButton />
          </>
        )}
      </body>
    </html>
  );
}
```

---

## `app/page.tsx`

```tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PricingGrid } from "@/components/PricingCard";
import { HeroAnimation } from "@/components/HeroAnimation";
import { HowItWorks } from "@/components/HowItWorks";
import { CreatorRibbons } from "@/components/CreatorRibbons";

export default async function Home() {
  const { userId } = await auth();

  // Signed-in users go straight to the creator workspace
  if (userId) {
    redirect("/create");
  }

  return (
    <div className="min-h-screen bg-[#fffeec] text-black">
      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-16 sm:px-8 lg:px-10">
        {/* ─── Hero ─── */}
        <section className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="mb-6 inline-block rounded-full border border-[#36A64F]/30 bg-[#36A64F]/10 px-4 py-1 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest text-[#36A64F]">
            VIBE CODING HACKATHON 2026
          </span>

          <h1 className="font-['Space_Grotesk'] text-5xl font-bold tracking-tight sm:text-7xl">
            <span className="text-black/80">Product placement,</span>{" "}
            <span className="italic text-[#36A64F]">minus the studio.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-[#1a1a1a]/60 sm:text-xl">
            The AI that turns any video into a shoppable storefront —<br className="hidden sm:inline" /> seamless product placement in every frame.
          </p>

          {/* ─── Ribbon animation ─── */}
          <div className="mt-6 w-full">
            <HeroAnimation />
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="rounded-lg bg-[#36A64F] px-7 py-3 font-['Space_Mono'] text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#36A64F]/90"
            >
              Get Started for Free
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-black/15 bg-white px-7 py-3 font-['Space_Mono'] text-sm font-bold uppercase tracking-wider text-black/70 transition hover:bg-black/5"
            >
              See a Demo
            </Link>
          </div>

          <p className="mt-4 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/30">
            No credit card required
          </p>
        </section>

      </main>

      {/* ─── How it works (carousel, full-bleed) ─── */}
      <HowItWorks />

      {/* ─── Built for Every Creator (ribbon boxes) ─── */}
      <CreatorRibbons />

      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 sm:px-8 lg:px-10">
        {/* ─── Tech Stack ─── */}
        <section className="mt-20">
          <h2 className="mb-8 text-center font-['Space_Grotesk'] text-2xl font-bold tracking-tight">
            Powered by Cutting-Edge AI
          </h2>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { name: "GPT-4o Vision", role: "AI Director" },
              { name: "Flux Kontext Max", role: "Product Placement" },
              { name: "Kling Video", role: "Animation" },
              { name: "Fal.ai", role: "GPU Inference" },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-black/10 bg-white/50 p-4 text-center">
                <p className="text-sm font-semibold text-black">{t.name}</p>
                <p className="mt-0.5 font-['Space_Mono'] text-xs text-black/40">{t.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section id="pricing" className="mt-20">
          <h2 className="mb-8 text-center font-['Space_Grotesk'] text-2xl font-bold tracking-tight">Pricing</h2>
          <PricingGrid />
        </section>
      </main>

      <footer className="border-t border-black/10 py-6 text-center font-['Space_Mono'] text-xs uppercase tracking-widest text-black/40">
        Built for Vibe Coding Hackathon 2026
      </footer>
    </div>
  );
}
```

---

## `app/actions/process-video.ts`

```tsx
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
Your #1 PRIORITY is CHARACTER INTERACTION — but the interaction MUST match the product type.

CRITICAL — PRODUCT-TYPE-AWARE INTERACTION:
Different products are used on different body parts. You MUST choose the right frame AND the right interaction based on what the product actually is:

  SHOES/SNEAKERS/FOOTWEAR:
  → The product goes on FEET, never in hands.
  → Find a frame showing the person's FEET or LEGS — walking shots, standing shots, close-ups of the lower body.
  → "The person is wearing [brand] shoes on their feet" — NEVER "holding shoes in their hand"
  → If no frame shows feet clearly, pick a full-body standing shot.

  DRINKS (cans, bottles, cups):
  → Held in HAND, being sipped/drunk from.
  → Find a frame where a hand is visible — sitting, standing, mid-conversation.
  → "The person is holding a [brand] can in their right hand" or "drinking from a [brand] bottle"

  HEADPHONES/EARPHONES/AUDIO:
  → Worn on HEAD/EARS, never held.
  → Find a frame showing the person's head/upper body clearly.
  → "The person is wearing [brand] headphones over their ears"

  GLASSES/SUNGLASSES:
  → Worn on FACE, never held.
  → Find a frame with a clear view of the person's face.
  → "The person is wearing [brand] sunglasses on their face"

  WATCHES/BRACELETS/JEWELRY:
  → Worn on WRIST/HAND.
  → Find a frame where the wrist/hand is visible.

  CLOTHING/APPAREL (jackets, t-shirts, hats):
  → WORN on the appropriate body part.
  → Find a frame showing the relevant body area.

  FOOD/SNACKS:
  → Being eaten, held, or on a plate/counter near the person.
  → Find a frame in a kitchen/dining/casual setting.

  TECH (phones, laptops, tablets):
  → Being USED — typing, scrolling, looking at screen.
  → Find a frame where hands are visible.

  OTHER PACKAGED PRODUCTS (packets, boxes):
  → Held in hand or placed on the nearest surface.

FRAME SELECTION RULES:
- MATCH the frame to the product's body part. Shoes? Find feet. Headphones? Find the head. Drinks? Find hands.
- If the video has a close-up or cut showing the relevant body part, ALWAYS prefer that frame — even if it is a brief shot.
- If no frame shows the right body part, pick a full-body shot where the AI can add the product naturally.
- Prefer frames where the person is relatively still — NOT fast action.
- Consider the scene narrative: kitchen = food/drinks, office = tech/drinks, outdoors = shoes/sunglasses, etc.

- FALLBACK (only if no person is visible): Product placed on a surface near where a person would be.
- AVOID: Product on wrong body part (shoes in hands, headphones on a table), product floating, product far from any person.

THE EDITING INSTRUCTION (inpaintingPrompt) IS THE MOST CRITICAL FIELD:
Write it as a direct command to an AI image editor. This is what actually controls the output quality.

═══ ABSOLUTE RULE — SCENE PRESERVATION ═══
The edited frame MUST be VISUALLY IDENTICAL to the original frame in every way EXCEPT for the addition of the product. This is NON-NEGOTIABLE:
- SAME camera angle — do NOT change the shot (medium shot stays medium, wide stays wide)
- SAME framing and composition — do NOT zoom in, zoom out, or reframe
- SAME character positions, poses, clothing, and body language — change ONLY what is strictly necessary to hold/wear the product
- SAME background — every single element in the background must remain unchanged
- SAME lighting direction, color temperature, and shadows
- ALL characters visible in the original frame MUST remain visible in the edited frame
- If the original shows two people talking, the edit must STILL show two people talking — just with the product added
- The viewer should NOT be able to tell the frame was edited unless they notice the product

Your inpaintingPrompt MUST begin with: "Keep the exact same camera angle, framing, and composition. "
Then describe ONLY the minimal change needed to add the product.

═══ CRITICAL — TRANSITIONAL ARRIVAL STATE ═══
The edited frame is the FIRST FRAME of a 5-second video clip. The video will animate the character USING the product.
Therefore, the edited frame must show the product in its PRE-USE "arrival" state — NOT already fully in use.
This creates a smooth sequence: crossfade reveals product nearby → video shows character picking it up / putting it on.

FOR CHARACTER INTERACTION — show ARRIVAL state, NOT final use:
- HEADPHONES: "Keep the exact same camera angle, framing, and composition. Add [brand] headphones hanging around the person's NECK (not on ears yet), resting on their shoulders, the logo visible on the ear cup." The VIDEO will show them reaching up and putting the headphones on.
- DRINKS: "Keep the exact same camera angle, framing, and composition. Add a [brand] can/bottle on the nearest surface beside the person (table, counter, desk), within arm's reach." The VIDEO will show them reaching for it and taking a sip.
- FOOD: "Keep the exact same camera angle, framing, and composition. Add a [brand] product on the nearest surface beside the person or loosely in their hand at waist level." The VIDEO will show them taking a bite.
- GLASSES/SUNGLASSES: "Keep the exact same camera angle, framing, and composition. Add [brand] glasses in the person's hand, held casually at chest level." The VIDEO will show them putting the glasses on.
- SHOES: "Keep the exact same camera angle, framing, and composition. Add [brand] sneakers on the person's feet." (No transitional state needed — shoes are already worn.)
- WATCH/JEWELRY: "Keep the exact same camera angle, framing, and composition. Add a [brand] watch on the person's wrist." (Already worn.)
- TECH (phones, laptops): "Keep the exact same camera angle, framing, and composition. Add a [brand] phone in the person's hand, held at their side." The VIDEO will show them glancing at it.
- OTHER PACKAGED PRODUCTS: "Keep the exact same camera angle, framing, and composition. Add a [brand] product on the nearest surface beside the person."
- The character's pose may change MINIMALLY to accommodate the product — but everything else stays identical

FOR ALL PLACEMENTS:
- Be VERY SPECIFIC about position and interaction
- Describe the product accurately: brand name, type, packaging, distinctive colors/logo
- Specify lighting match: "lit by the same warm overhead lamp", "matching the cool blue office lighting"
- Specify perspective/angle: "viewed from the same slight downward angle as the camera"
- Specify scale: "at realistic proportional size relative to the person's hand/the objects around it"
- EXPLICITLY STATE: "Do not change the camera angle, zoom level, framing, background, other characters, or overall composition."
- 100-180 words. More detail = better result.

Return a JSON object with EXACTLY these fields:
{
  "chosenFrameIndex": 0,
  "chosenTimestamp": 0.0,
  "maskRegion": { "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0 },
  "sceneDescription": "Detailed description of the scene — environment, people (positions, actions), objects, surfaces, lighting direction and color temperature, mood. 2-3 sentences.",
  "placementRationale": "WHY you chose this frame and this specific placement strategy. How does the product naturally fit into this exact moment? What makes this placement feel authentic rather than forced? 2-3 sentences.",
  "inpaintingPrompt": "EDITING INSTRUCTION — the direct command for the AI image editor. See detailed instructions above. 80-150 words.",
  "videoMotionPrompt": "Prompt for image-to-video animation. The first frame shows the product in its ARRIVAL state (see inpaintingPrompt). Your job is to animate the character USING the product across 5 seconds. CRITICAL RULES in priority order: (1) Camera stays LOCKED — same angle, framing, composition. No zooming, panning, or angle changes. (2) ALL characters stay visible and continue their original activity (talking, gesturing, etc). (3) The character performs the PRODUCT-USE ACTION during the clip — match the product type: HEADPHONES=the person reaches up, lifts the headphones from around their neck, and places them over their ears; DRINK=the person reaches for the can/bottle on the surface, picks it up, and takes a casual sip; FOOD=the person picks up the food item and takes a bite; GLASSES=the person lifts the glasses to their face and puts them on; PHONE=the person raises the phone and glances at the screen. The action should be smooth and unhurried — like a natural gesture the character does all the time. (4) Ambient scene motion: background people walking, gentle natural sway, consistent lighting. 70-120 words.",
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

/* ═══════ Persist fal.ai assets to Supabase Storage ═══════════════ */
/*
 * Fal.ai-generated URLs are temporary (TTL ~24h). We copy the assets
 * to our own Supabase Storage bucket so they remain accessible forever.
 */
async function persistToStorage(
  url: string,
  userId: string,
  suffix: string,
): Promise<string | null> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Persist] Failed to fetch ${suffix}:`, res.status);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const ext = contentType.includes("video") ? "mp4" : "jpg";
    const path = `${userId}/${Date.now()}-${suffix}.${ext}`;

    const { error } = await supabase.storage
      .from("user-videos")
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      console.warn(`[Persist] Upload error for ${suffix}:`, error.message);
      return null;
    }

    const { data } = supabase.storage.from("user-videos").getPublicUrl(path);
    console.log(`[Persist] ✓ Saved ${suffix} → ${data.publicUrl.slice(0, 80)}`);
    return data.publicUrl;
  } catch (err) {
    console.warn(`[Persist] Exception for ${suffix}:`, err);
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

    // Persist inpainted frame to own storage (fal.ai URLs are temporary)
    if (compositedFrameUrl) {
      const persistedFrame = await persistToStorage(compositedFrameUrl, userId, "inpainted-frame");
      if (persistedFrame) {
        compositedFrameUrl = persistedFrame;
        pipelineSteps.push("frame-persisted");
      }
    }

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

      // Persist generated video to own storage (fal.ai URLs are temporary)
      if (generatedVideoUrl) {
        const persistedVideo = await persistToStorage(generatedVideoUrl, userId, "ai-clip");
        if (persistedVideo) {
          generatedVideoUrl = persistedVideo;
          pipelineSteps.push("video-persisted");
        }
      }
    }
  }

  const processedVideoUrl = generatedVideoUrl || input.sourceVideoUrl;

  // Extract a short product name from description for the CTA bar
  const productName = input.productDescription.split(/[—\-–.,;]/)[0].trim().slice(0, 40);

  const adSlot: AdSlot = {
    timestamp: chosenTimestamp,
    productName: productName || "Featured Product",
    productImageUrl: input.productImageUrl || DEFAULT_PRODUCT_IMAGE,
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
  return `Keep the exact same camera angle, framing, and composition. ${scene}Add a ${product} naturally into this scene. Place it on the most visible surface near any person in the frame — a table, counter, or desk. The product should be at realistic scale, matching the scene's lighting direction and color temperature. It should look like it was physically present when the photo was taken, with correct perspective and subtle shadows. Do not change the camera angle, zoom level, framing, background, other characters, or overall composition.`;
}
```

---

## `app/actions/sync-user.ts`

```tsx
"use server";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

type SyncUserResult = {
  synced: boolean;
  created: boolean;
};

export async function syncUserProfile(clerkUserId?: string): Promise<SyncUserResult> {
  const { userId: authUserId } = await auth();
  const userId = clerkUserId ?? authUserId;

  if (!userId) {
    return { synced: false, created: false };
  }

  const supabase = getSupabaseServiceRoleClient();

  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read profile: ${readError.message}`);
  }

  if (existingProfile) {
    return { synced: true, created: false };
  }

  const { error: createError } = await supabase
    .from("profiles")
    .insert({ clerk_user_id: userId, plan: "free" });

  if (createError && createError.code !== "23505") {
    throw new Error(`Failed to create profile: ${createError.message}`);
  }

  return { synced: true, created: true };
}
```

---

## `app/api/upload/route.ts`

```tsx
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

/* ─── Simple in-memory rate limiter ─── */
const RATE_WINDOW_MS = 60_000; // 1 minute
const MAX_UPLOADS_PER_WINDOW = 5;
const uploadLog = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (uploadLog.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= MAX_UPLOADS_PER_WINDOW) return true;
  timestamps.push(now);
  uploadLog.set(userId, timestamps);
  return false;
}

/**
 * POST /api/upload
 * Accepts FormData with a "file" field (video/mp4).
 * Uploads to Supabase Storage and returns the public URL.
 * Rate-limited to 5 uploads per minute per user.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isRateLimited(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute before uploading again." },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Only video files allowed" }, { status: 400 });
    }

    // Generate a unique path: userId/timestamp-filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 50);
    const path = `${userId}/${Date.now()}-${safeName}`;

    const supabase = getSupabaseServiceRoleClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("user-videos")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Upload] Storage error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("user-videos")
      .getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("[Upload]", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

---

## `app/api/checkout/route.ts`

```tsx
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/checkout
 * Body: { priceId: string }
 *
 * Creates a Stripe Checkout session and returns the URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { priceId } = body as { priceId?: string };

    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: { clerkUserId: userId, priceId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Checkout]", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

---

## `app/api/webhook/stripe/route.ts`

```tsx
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

/**
 * POST /api/webhook/stripe
 *
 * Handles Stripe webhook events:
 *  - checkout.session.completed → upgrade plan
 *  - customer.subscription.deleted → downgrade to free
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const clerkUserId = session.metadata?.clerkUserId;
    const priceId = session.metadata?.priceId;
    const customerId = typeof session.customer === "string" ? session.customer : null;

    if (clerkUserId) {
      const creatorPriceId = process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID;
      const studioPriceId = process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID;

      let plan = "creator"; // default upgrade
      if (priceId === studioPriceId) plan = "studio";
      else if (priceId === creatorPriceId) plan = "creator";

      console.log("[Webhook] clerkUserId:", clerkUserId, "priceId:", priceId, "→ plan:", plan, "customer:", customerId);

      const updatePayload: Record<string, string> = { plan };
      if (customerId) updatePayload.stripe_customer_id = customerId;

      await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("clerk_user_id", clerkUserId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
    const clerkUserId = (subscription.metadata as Record<string, string>)?.clerkUserId;

    // Prefer customer_id lookup (reliable), fall back to metadata
    if (customerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("clerk_user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ plan: "free" })
          .eq("stripe_customer_id", customerId);
        console.log("[Webhook] Downgraded customer", customerId, "to free");
      }
    } else if (clerkUserId) {
      await supabase
        .from("profiles")
        .update({ plan: "free" })
        .eq("clerk_user_id", clerkUserId);
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## `app/create/page.tsx`

```tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { VideoWorkflowPanel } from "@/components/VideoWorkflowPanel";

/* ─── Plan limits ─── */
const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  creator: 10,
  studio: 50,
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  studio: "Studio",
};

export default async function CreatePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = getSupabaseServiceRoleClient();

  const [profileResult, videosResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan")
      .eq("clerk_user_id", userId)
      .maybeSingle(),
    supabase
      .from("videos")
      .select("id")
      .eq("clerk_user_id", userId),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to load profile: ${profileResult.error.message}`);
  }

  const plan = profileResult.data?.plan ?? "free";
  const used = videosResult.data?.length ?? 0;
  const limit = PLAN_LIMITS[plan] ?? 1;
  const canCreate = used < limit;

  return (
    <main className="min-h-screen bg-[#fffeec] px-6 py-14 text-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        {/* ─── Header ─── */}
        <header>
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight">
            Create New Video
          </h1>
          <p className="mt-2 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            Enter your video and product details — the AI Director will find the perfect moment for natural product placement.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/50">
              {PLAN_LABELS[plan] ?? plan} Plan
            </span>
            <span className="font-['Space_Mono'] text-xs text-black/40">
              {used} / {limit} videos used
            </span>
          </div>
        </header>

        {/* ─── Generator ─── */}
        {canCreate ? (
          <VideoWorkflowPanel plan={plan} />
        ) : (
          <section className="rounded-2xl border border-[#FF6363]/30 bg-[#FF6363]/5 p-8 text-center">
            <p className="font-['Space_Grotesk'] text-xl font-semibold text-[#FF6363]">
              Video limit reached
            </p>
            <p className="mt-2 text-sm text-black/60" style={{ fontFamily: "'Inter', sans-serif" }}>
              You&apos;ve used all {limit} video{limit > 1 ? "s" : ""} on the{" "}
              {PLAN_LABELS[plan]} plan.
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-block rounded-lg bg-[#36A64F] px-6 py-2.5 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 transition"
            >
              Upgrade Plan
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
```

---

## `app/dashboard/page.tsx`

```tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { VideoHistory } from "@/components/VideoHistory";
import { Film, Crown, Calendar, Plus } from "lucide-react";

/* ─── Plan limits ─── */
const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  creator: 10,
  studio: 50,
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  studio: "Studio",
};

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = getSupabaseServiceRoleClient();

  // Fetch profile + videos in parallel
  const [profileResult, videosResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, created_at")
      .eq("clerk_user_id", userId)
      .maybeSingle(),
    supabase
      .from("videos")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to load profile: ${profileResult.error.message}`);
  }

  const plan = profileResult.data?.plan ?? "free";
  const videos = videosResult.data ?? [];
  const limit = PLAN_LIMITS[plan] ?? 1;
  const used = videos.length;
  const canCreate = used < limit;

  return (
    <main className="min-h-screen bg-[#fffeec] px-6 py-14 text-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        {/* ─── Header ─── */}
        <header>
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            Your AI product placement studio at a glance.
          </p>
        </header>

        {/* ─── Stats row ─── */}
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-black/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/40">
              <Crown className="h-3.5 w-3.5" />
              Plan
            </div>
            <p className="mt-2 font-['Space_Grotesk'] text-2xl font-semibold capitalize text-black">
              {PLAN_LABELS[plan] ?? plan}
            </p>
            {plan === "free" && (
              <Link href="/pricing" className="mt-2 inline-block font-['Space_Mono'] text-xs uppercase tracking-wider text-[#36A64F] hover:text-[#36A64F]/70 transition">
                Upgrade →
              </Link>
            )}
          </article>

          <article className="rounded-2xl border border-black/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/40">
              <Film className="h-3.5 w-3.5" />
              Videos Used
            </div>
            <p className="mt-2 font-['Space_Grotesk'] text-2xl font-semibold text-black">
              {used} <span className="text-base font-normal text-black/40">/ {limit}</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className={`h-full rounded-full transition-all ${
                  used >= limit ? "bg-[#FF6363]" : "bg-[#36A64F]"
                }`}
                style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-black/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/40">
              <Calendar className="h-3.5 w-3.5" />
              Member Since
            </div>
            <p className="mt-2 font-['Space_Grotesk'] text-lg font-medium text-black/80">
              {profileResult.data?.created_at
                ? new Date(profileResult.data.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </article>
        </section>

        {/* ─── Create CTA ─── */}
        {canCreate ? (
          <Link
            href="/create"
            className="group flex items-center justify-between rounded-2xl border-2 border-dashed border-[#36A64F]/30 bg-[#36A64F]/5 p-6 transition hover:border-[#36A64F]/50 hover:bg-[#36A64F]/10"
          >
            <div>
              <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-black">
                Create New Video
              </h2>
              <p className="mt-1 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
                Upload a video, describe your product, and let the AI Director handle the rest.
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#36A64F] text-white transition group-hover:scale-110">
              <Plus className="h-6 w-6" />
            </div>
          </Link>
        ) : (
          <section className="rounded-2xl border border-[#FF6363]/30 bg-[#FF6363]/5 p-6 text-center">
            <p className="font-['Space_Grotesk'] text-lg font-semibold text-[#FF6363]">Video limit reached</p>
            <p className="mt-1 text-sm text-black/60" style={{ fontFamily: "'Inter', sans-serif" }}>
              You&apos;ve used all {limit} video{limit > 1 ? "s" : ""} on the {PLAN_LABELS[plan]} plan.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block rounded-lg bg-[#36A64F] px-5 py-2 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 transition"
            >
              Upgrade Plan
            </Link>
          </section>
        )}

        {/* ─── Video history ─── */}
        <div>
          <h2 className="mb-4 font-['Space_Grotesk'] text-xl font-semibold tracking-tight">Your Videos</h2>
          <VideoHistory videos={videos} plan={plan} />
        </div>
      </div>
    </main>
  );
}
```

---

## `app/demo/page.tsx`

```tsx
import Link from "next/link";
import { DemoPlayer } from "./DemoPlayer";

export const metadata = {
  title: "RevSlot — Live Demo",
  description:
    "See AI product placement in action. This precomputed demo shows a McDonald's placement generated by RevSlot's AI Director pipeline.",
};

/*
 * /demo — Public, no-auth page
 *
 * Shows a precomputed AI placement result in the VibePlayer so judges
 * (or anyone) can see the end product instantly, even if the live
 * pipeline is unavailable due to cold starts or API rate limits.
 */
export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#fffeec] px-6 py-14 text-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        {/* Header */}
        <header className="text-center">
          <span className="mb-4 inline-block rounded-full border border-[#36A64F]/30 bg-[#36A64F]/10 px-4 py-1 font-['Space_Mono'] text-xs font-bold uppercase tracking-widest text-[#36A64F]">
            LIVE DEMO
          </span>
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight">
            AI Product Placement in Action
          </h1>
          <p className="mt-3 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            This is a real result from RevSlot&apos;s AI Director pipeline. The original Friends clip
            was analyzed by GPT-4o Vision, which chose the best frame for a McDonald&apos;s placement.
            Flux Kontext Max composited the product into the scene, and Kling Video animated a 5-second
            AI clip. The VibePlayer below splices everything together with a shoppable overlay.
          </p>
        </header>

        {/* Player */}
        <DemoPlayer />

        {/* Pipeline breakdown */}
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6 space-y-3">
          <h2 className="font-['Space_Grotesk'] text-lg font-semibold">What happened behind the scenes</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-black/70" style={{ fontFamily: "'Inter', sans-serif" }}>
            <li>
              <strong>Frame sampling</strong> — 12 frames were extracted across the video for analysis.
            </li>
            <li>
              <strong>AI Director (GPT-4o Vision)</strong> — Analyzed all frames, selected timestamp 1.4s as the best moment,
              and wrote product-type-aware compositing instructions for a McDonald&apos;s placement.
            </li>
            <li>
              <strong>Flux Kontext Max</strong> — Regenerated the chosen frame with the product naturally integrated
              (correct perspective, lighting, shadows). Not pasted, generated from scratch.
            </li>
            <li>
              <strong>Kling Video</strong> — Animated the composited frame into a seamless 5-second clip.
            </li>
            <li>
              <strong>VibePlayer</strong> — Spliced the AI clip into the original video with a shoppable buy-now bubble.
            </li>
          </ol>
        </section>

        {/* Pipeline steps */}
        <div className="rounded-xl border border-black/10 bg-white/60 p-4">
          <p className="text-xs font-['Space_Mono'] uppercase tracking-wider text-black/40 mb-2">Pipeline steps</p>
          <div className="flex flex-wrap gap-2">
            {[
              "reference-image-analyzed",
              "director-decided",
              "ai-placement-done",
              "frame-persisted",
              "video-generated",
              "video-persisted",
            ].map((step) => (
              <span
                key={step}
                className="text-xs px-2.5 py-1 rounded-full bg-[#36A64F]/10 text-[#36A64F]"
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3">
          <Link
            href="/sign-up"
            className="inline-block rounded-lg bg-[#36A64F] px-7 py-3 font-['Space_Mono'] text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#36A64F]/90"
          >
            Try It Yourself
          </Link>
          <p className="text-xs text-black/30 font-['Space_Mono'] uppercase tracking-widest">
            No credit card required
          </p>
        </div>
      </div>
    </main>
  );
}
```

---

## `app/demo/DemoPlayer.tsx`

```tsx
"use client";

import { VibePlayer } from "@/components/VibePlayer";
import type { AdSlot } from "@/components/VibePlayer";

/*
 * Precomputed demo data from a real pipeline run.
 * These URLs point to assets already persisted in Supabase Storage.
 */
const DEMO_ORIGINAL_URL =
  "https://tuelvhjkiqqvaeyugunu.supabase.co/storage/v1/object/public/user-videos/user_3A5E0U7wkYVPkj2bi6dKTUbZCeN/1771970501783-friends.mp4";

const DEMO_AI_CLIP_URL =
  "https://tuelvhjkiqqvaeyugunu.supabase.co/storage/v1/object/public/user-videos/user_3A5E0U7wkYVPkj2bi6dKTUbZCeN/1771970779520-ai-clip.mp4";

const DEMO_AD_SLOT: AdSlot = {
  timestamp: 1.44160835,
  productName: "McDonald's",
  productImageUrl:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80",
  buyUrl: "https://mcdindia.com/",
  placement: { x: 0.4, y: 0.6 },
};

export function DemoPlayer() {
  return (
    <div className="relative">
      <VibePlayer
        originalVideoUrl={DEMO_ORIGINAL_URL}
        aiClipUrl={DEMO_AI_CLIP_URL}
        insertAtTimestamp={DEMO_AD_SLOT.timestamp}
        adSlot={DEMO_AD_SLOT}
      />
      {/* AI disclosure badge */}
      <div className="mt-2 text-center">
        <span className="inline-block rounded-full border border-black/10 bg-white/60 px-3 py-1 font-['Space_Mono'] text-[10px] uppercase tracking-widest text-black/40">
          AI-enhanced product placement
        </span>
      </div>
    </div>
  );
}
```

---

## `app/pricing/page.tsx`

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { PricingGrid } from "@/components/PricingCard";

export default async function PricingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("clerk_user_id", userId)
    .single();

  const currentPlan = data?.plan ?? "free";

  return (
    <main className="min-h-screen bg-[#fffeec] px-6 py-14 text-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="text-center">
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight">
            Choose Your Plan
          </h1>
          <p className="mt-2 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            Upgrade to unlock more videos, remove watermarks, and get priority AI processing.
          </p>
        </header>

        <PricingGrid currentPlan={currentPlan} />
      </div>
    </main>
  );
}
```

---

## `app/sign-in/[[...sign-in]]/page.tsx`

```tsx
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffeec] px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="text-center text-sm text-black/50">Already have an account? Sign in below.</p>
        <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}
```

---

## `app/sign-up/[[...sign-up]]/page.tsx`

```tsx
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffeec] px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="text-center text-sm text-black/50">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-black underline-offset-4 hover:underline">
            Sign in
          </Link>
          .
        </p>
        <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}
```

---

## `components/AuthNav.tsx`

```tsx
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "@clerk/nextjs";

export function AuthNav() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/music/innerbloom.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#fffeec]/90 backdrop-blur">
      <div className="flex w-full items-center px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="font-['Space_Grotesk'] text-sm font-bold tracking-wide text-black">
          Rev<span className="text-[#36A64F]">Slot</span>
        </Link>

        {/* Auth buttons — centered-ish via ml-auto */}
        <div className="ml-auto flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="redirect">
              <button className="rounded-md border border-black/10 px-3 py-1.5 font-['Space_Mono'] text-xs font-semibold uppercase tracking-wider text-black hover:border-black/30">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="rounded-md bg-[#36A64F] px-3 py-1.5 font-['Space_Mono'] text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#36A64F]/90">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <Link
              href="/create"
              className="rounded-md bg-[#36A64F] px-3 py-1.5 font-['Space_Mono'] text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 transition"
            >
              + Create
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-black/10 px-3 py-1.5 font-['Space_Mono'] text-xs font-medium uppercase tracking-wider text-black/70 hover:border-black/30"
            >
              Dashboard
            </Link>
            <SignOutButton>
              <button className="rounded-md border border-black/10 px-3 py-1.5 font-['Space_Mono'] text-xs font-semibold uppercase tracking-wider text-black hover:border-black/30">
                Sign Out
              </button>
            </SignOutButton>
          </SignedIn>
        </div>

        {/* Music player — pinned far right, signed-in only */}
        <SignedIn>
          <button
            onClick={toggleMusic}
            className="ml-3 flex flex-col items-center gap-0.5 group shrink-0"
            aria-label={playing ? "Pause music" : "Play music"}
          >
            <img
              src="/music/innerbloomcover.jpg"
              alt="Innerbloom"
              className="h-8 w-8 rounded-md object-cover border border-black/10 group-hover:border-black/25 transition"
            />
            <span className="text-[8px] font-['Space_Mono'] uppercase tracking-wider text-black/40">
              {playing ? "Pause" : "Play"}
            </span>
          </button>
        </SignedIn>
      </div>
    </header>
  );
}
```

---

## `components/CreatorRibbons.tsx`

```tsx
"use client";

const CARDS = [
  {
    title: "Content Creators",
    ribbon: "Monetize your existing videos by inserting brand-native product placements — no reshoots, no manual editing.",
    position: "30%",       // 30% from left
    ribbonBg: "#36A64F",   // green
    ribbonText: "#fffeec",
  },
  {
    title: "E-Commerce Brands",
    ribbon: "See your product in lifestyle scenes instantly. Generate shoppable video ads with a single click.",
    position: "50%",       // center
    ribbonBg: "#000000",   // black
    ribbonText: "#fffeec",
  },
  {
    title: "Ad Agencies",
    ribbon: "Pitch product placement concepts in hours, not weeks. A/B test placements across different scenes and products.",
    position: "70%",       // 70% from left (30% right)
    ribbonBg: "#FF6363",   // coral
    ribbonText: "#fffeec",
  },
];

function RibbonRow({
  title,
  ribbon,
  speed,
  position,
  ribbonBg,
  ribbonText,
}: {
  title: string;
  ribbon: string;
  speed: number;
  position: string;
  ribbonBg: string;
  ribbonText: string;
}) {
  const repeated = (ribbon + "  ✦  ").repeat(12);

  return (
    <div className="relative flex items-center w-full" style={{ height: 30 }}>
      {/* Left side: transparent background, flowing text */}
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ right: `calc(100% - ${position})` }}>
        <div
          className="flex items-center h-full whitespace-nowrap animate-ribbon-right"
          style={{ animationDuration: `${speed}s` }}
        >
          <span className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.08em] text-black/20">
            {repeated}
          </span>
        </div>
      </div>

      {/* Right side: colored background, flowing text */}
      <div
        className="absolute inset-y-0 right-0 overflow-hidden rounded-r-full"
        style={{ left: position, backgroundColor: ribbonBg }}
      >
        <div
          className="flex items-center h-full whitespace-nowrap animate-ribbon-right"
          style={{ animationDuration: `${speed}s` }}
        >
          <span
            className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.08em]"
            style={{ color: `${ribbonText}99` }}
          >
            {repeated}
          </span>
        </div>
      </div>

      {/* Center box */}
      <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: position }}>
        <div className="flex items-center gap-2 rounded-2xl border border-[#36A64F]/25 bg-[#fffeec] px-5 py-2.5 shadow-[0_2px_30px_rgba(0,0,0,0.06)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#36A64F]/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#36A64F]">
              <path
                d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="font-['Space_Grotesk'] text-sm font-bold tracking-tight text-black/85 whitespace-nowrap">
            {title}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CreatorRibbons() {
  return (
    <section className="py-16 overflow-hidden">
      <h2 className="mb-3 text-center font-['Space_Grotesk'] text-2xl font-bold tracking-tight">
        Built for Every Creator
      </h2>
      <p className="mx-auto mb-10 max-w-lg text-center text-sm text-black/50">
        Whether you&apos;re a solo influencer or a brand agency, RevSlot automates
        product placement at a fraction of the cost.
      </p>

      <div className="flex flex-col gap-16">
        {CARDS.map((card, i) => (
          <RibbonRow
            key={card.title}
            title={card.title}
            ribbon={card.ribbon}
            speed={28 + i * 6}
            position={card.position}
            ribbonBg={card.ribbonBg}
            ribbonText={card.ribbonText}
          />
        ))}
      </div>
    </section>
  );
}
```

---

## `components/HeroAnimation.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";

const INPUT_TEXT = "headphones  ·  burger  ·  cold drink  ·  energy drink  ·  sneakers  ·  sunglasses  ·  laptop  ·  coffee  ·  watch  ·  earbuds  ·  soda  ·  backpack  ·  ";
const OUTPUT_TEXT = "Beats  ✦  McDonald's  ✦  Coca-Cola  ✦  Red Bull  ✦  Nike  ✦  Ray-Ban  ✦  MacBook  ✦  Starbucks  ✦  Rolex  ✦  AirPods  ✦  Pepsi  ✦  JanSport  ✦  ";

export function HeroAnimation() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="relative w-full flex items-center justify-center" style={{ height: 80 }}><div className="h-12 w-40 rounded-2xl bg-black/5" /></div>;
  }

  return (
    <div className="relative w-full flex items-center justify-center" style={{ height: 80 }}>
      {/* ─── Input ribbon (no background, just flowing text) ─── */}
      <div className="absolute right-1/2 mr-20 top-1/2 -translate-y-1/2 overflow-hidden" style={{ width: "50vw", height: 30 }}>
        <div className="flex items-center h-full whitespace-nowrap animate-ribbon-right" style={{ animationDuration: "25s" }}>
          <span className="font-['Space_Mono'] text-[11px] uppercase tracking-[0.08em] text-black/25">
            {INPUT_TEXT.repeat(8)}
          </span>
        </div>
      </div>

      {/* ─── Output ribbon (black background) ─── */}
      <div className="absolute left-1/2 ml-20 top-1/2 -translate-y-1/2 overflow-hidden rounded-r-full" style={{ width: "50vw", height: 30, background: "black" }}>
        <div className="flex items-center h-full whitespace-nowrap animate-ribbon-right" style={{ animationDuration: "20s" }}>
          <span className="font-['Space_Mono'] text-[11px] uppercase tracking-[0.1em] text-[#fffeec]/70">
            {OUTPUT_TEXT.repeat(10)}
          </span>
        </div>
      </div>

      {/* ─── Central RevSlot box ─── */}
      <div className="relative z-10 flex items-center gap-2.5 rounded-2xl border border-[#36A64F]/25 bg-[#fffeec] px-5 py-3 shadow-[0_2px_30px_rgba(0,0,0,0.06)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#36A64F]/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#36A64F]">
            <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-black/85">RevSlot</span>
          <span className="font-['Space_Mono'] text-[7px] uppercase tracking-[0.2em] text-[#36A64F]/70">AI Director</span>
        </div>
      </div>
    </div>
  );
}
```

---

## `components/HowItWorks.tsx`

```tsx
"use client";

const STEPS = [
  { src: "/howitworks/before.jpg", step: "01", label: "Upload Video" },
  { src: "/howitworks/nike2.png", step: "02", label: "Add Product" },
  { src: "/howitworks/after.jpg", step: "03", label: "AI Result" },
];

function Arrow() {
  return (
    <div className="flex items-center justify-center px-2 sm:px-4 shrink-0">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#36A64F]">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="py-16">
      <h2 className="mb-10 text-center font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-black/90 sm:text-3xl">
        How It Works
      </h2>

      <div className="flex items-center justify-center gap-3 sm:gap-5 px-4">
        {STEPS.map((item, i) => (
          <div key={item.step} className="flex items-center gap-3 sm:gap-5">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-[0.2em] text-[#36A64F]">
                {item.step}
              </span>
              <div className="rounded-2xl overflow-hidden border border-black/6 shadow-[0_4px_30px_rgba(0,0,0,0.06)]">
                <img
                  src={item.src}
                  alt={item.label}
                  className="w-40 h-40 sm:w-56 sm:h-56 object-cover"
                />
              </div>
              <span className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.15em] text-black/40">
                {item.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## `components/PricingCard.tsx`

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";

/* ─── Plan hierarchy (higher = better) ─── */
const PLAN_RANK: Record<string, number> = { free: 0, creator: 1, studio: 2 };

type PricingCardProps = {
  name: string;
  price: string;
  features: string[];
  priceId?: string;      // Stripe price ID — omit for free tier
  highlighted?: boolean; // Visual emphasis
  icon?: React.ReactNode;
  currentPlan?: string;
};

export function PricingCard({
  name,
  price,
  features,
  priceId,
  highlighted = false,
  icon,
  currentPlan,
}: PricingCardProps) {
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const cardRank = PLAN_RANK[name.toLowerCase()] ?? 0;
  const userRank = currentPlan ? (PLAN_RANK[currentPlan.toLowerCase()] ?? 0) : -1;
  const isCurrent = currentPlan?.toLowerCase() === name.toLowerCase();
  const isBelow = currentPlan != null && cardRank < userRank; // plan is lower than user's

  async function handleCheckout() {
    if (!isSignedIn) {
      toast.error("Sign in first to upgrade your plan.");
      return;
    }
    if (!priceId) {
      toast.info("You're already on the Free plan.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Checkout failed");

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
        highlighted
          ? "border-[#36A64F]/40 bg-white shadow-lg shadow-[#36A64F]/5"
          : "border-black/10 bg-white/50"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#36A64F] px-3 py-0.5 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider text-white">
          POPULAR
        </span>
      )}

      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-black">{name}</h2>
      </div>

      <p className="mt-3 font-['Space_Grotesk'] text-3xl font-bold text-black">{price}</p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-black/70">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#36A64F]" />
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={loading || isCurrent || isBelow}
        onClick={handleCheckout}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider transition ${
          isCurrent
            ? "cursor-default border-2 border-[#36A64F]/40 bg-[#36A64F]/5 text-[#36A64F]"
            : isBelow
              ? "cursor-default border border-black/5 bg-black/[0.02] text-black/25"
              : highlighted
                ? "bg-[#36A64F] text-white hover:bg-[#36A64F]/90"
                : "bg-black text-white hover:bg-black/80"
        }`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isCurrent ? "✓ Current Plan" : isBelow ? "Included" : priceId ? "Upgrade" : "Get Started"}
      </button>
    </article>
  );
}

/* ─── Plan configuration ─── */

export function PricingGrid({ currentPlan }: { currentPlan?: string }) {
  const creatorPriceId = process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID;
  const studioPriceId = process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID;

  return (
    <section className="grid gap-5 md:grid-cols-3">
      <PricingCard
        name="Free"
        price="$0"
        features={["1 Video", "Watermarked", "Community Support"]}
        currentPlan={currentPlan}
      />
      <PricingCard
        name="Creator"
        price="$20/mo"
        features={["10 Videos", "No Watermark", "Priority Support"]}
        priceId={creatorPriceId}
        highlighted
        icon={<Sparkles className="h-5 w-5 text-[#36A64F]" />}
        currentPlan={currentPlan}
      />
      <PricingCard
        name="Studio"
        price="$100/mo"
        features={["50 Videos", "No Watermark", "Priority AI", "Dedicated Support"]}
        priceId={studioPriceId}
        icon={<Zap className="h-5 w-5 text-[#FF6363]" />}
        currentPlan={currentPlan}
      />
    </section>
  );
}
```

---

## `components/ShoppableBubble.tsx`

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

type ShoppableBubbleProps = {
  visible: boolean;
  productName: string;
  imageUrl: string;
  buyUrl: string;
  onClose: () => void;
  /** Position within the video frame (0-1 range) — unused now, kept for API compat */
  position?: { x: number; y: number };
};

/**
 * A subtle shoppable CTA bar that appears at the bottom of the video.
 * The actual product placement is INPAINTED into the video itself —
 * this is just the interactive "Shop" overlay so viewers can buy.
 */
export function ShoppableBubble({
  visible,
  imageUrl,
  buyUrl,
  onClose,
}: ShoppableBubbleProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute bottom-4 right-4 z-30"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/15 py-1.5 pl-1.5 pr-1.5 shadow-2xl backdrop-blur-xl">
            {/* Product thumbnail */}
            <img
              src={imageUrl}
              alt="Product"
              className="h-8 w-8 rounded-full object-cover border border-white/20"
            />

            <a
              href={buyUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#36A64F] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#36A64F]/80 transition-colors"
            >
              Shop
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

---

## `components/VibePlayer.tsx`

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ShoppableBubble } from "@/components/ShoppableBubble";

export type AdSlot = {
  timestamp: number;
  productName: string;
  productImageUrl: string;
  buyUrl: string;
  /** Where to place the product in the frame (0-1 range) */
  placement?: { x: number; y: number };
};

/**
 * Playback phases:
 * 1. "original-before" — playing the original video from 0 → insertAt
 * 2. "ai-clip"         — playing the AI-generated clip (with shoppable overlay)
 * 3. "original-after"  — playing the original video from insertAt onward
 *
 * If no AI clip is provided, falls back to single-video mode with overlay at timestamp.
 */
type PlayPhase = "original-before" | "ai-clip" | "original-after";

/** Which viewing mode the user has selected */
type ViewMode = "spliced" | "original-only" | "ai-only";

type VibePlayerProps = {
  /** URL of the original source video */
  originalVideoUrl: string;
  /** URL of the AI-generated product placement clip (null = overlay-only mode) */
  aiClipUrl: string | null;
  /** Timestamp in the original video where the AI clip should be inserted */
  insertAtTimestamp: number;
  adSlot: AdSlot;
};

/* ─── Time formatting helper ─── */
function fmt(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VibePlayer({
  originalVideoUrl,
  aiClipUrl,
  insertAtTimestamp,
  adSlot,
}: VibePlayerProps) {
  const originalVideoRef = useRef<HTMLVideoElement | null>(null);
  const aiVideoRef = useRef<HTMLVideoElement | null>(null);

  const [phase, setPhase] = useState<PlayPhase>("original-before");
  const [viewMode, setViewMode] = useState<ViewMode>("spliced");
  const [showOverlay, setShowOverlay] = useState(false);
  const [hasTriggeredOverlay, setHasTriggeredOverlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  /* ─── Timeline state ─── */
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aiClipDuration, setAiClipDuration] = useState(5);
  const [originalDuration, setOriginalDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const hasSplice = !!aiClipUrl;

  /* ─── Compute combined timeline for spliced mode ─── */
  // The AI clip REPLACES aiClipDuration seconds of the original.
  // Before: 0 → insertAt | AI clip: aiClipDuration | After: (insertAt + aiClipDuration) → end
  const afterResumePoint = Math.min(insertAtTimestamp + aiClipDuration, originalDuration);
  const splicedTotal = hasSplice
    ? insertAtTimestamp + aiClipDuration + Math.max(0, originalDuration - afterResumePoint)
    : originalDuration;

  const getSplicedPosition = useCallback((): number => {
    if (!hasSplice || viewMode !== "spliced") return currentTime;
    if (phase === "original-before") return currentTime;
    if (phase === "ai-clip") return insertAtTimestamp + currentTime;
    // original-after: currentTime is in original video time (afterResumePoint onward)
    const afterResumePoint = Math.min(insertAtTimestamp + aiClipDuration, originalDuration || Infinity);
    return insertAtTimestamp + aiClipDuration + (currentTime - afterResumePoint);
  }, [hasSplice, viewMode, phase, currentTime, insertAtTimestamp, aiClipDuration, originalDuration]);

  /* ─── Track time from active video ─── */
  useEffect(() => {
    if (isSeeking) return;

    const vid =
      phase === "ai-clip" ? aiVideoRef.current : originalVideoRef.current;
    if (!vid) return;

    const onTime = () => {
      setCurrentTime(vid.currentTime);
    };
    const onDur = () => {
      if (phase !== "ai-clip") {
        setOriginalDuration(vid.duration);
        if (!hasSplice) setDuration(vid.duration);
      }
    };

    vid.addEventListener("timeupdate", onTime);
    vid.addEventListener("loadedmetadata", onDur);
    vid.addEventListener("durationchange", onDur);
    return () => {
      vid.removeEventListener("timeupdate", onTime);
      vid.removeEventListener("loadedmetadata", onDur);
      vid.removeEventListener("durationchange", onDur);
    };
  }, [phase, isSeeking, hasSplice]);

  // Track AI clip duration
  useEffect(() => {
    const vid = aiVideoRef.current;
    if (!vid) return;
    const onMeta = () => setAiClipDuration(vid.duration || 5);
    vid.addEventListener("loadedmetadata", onMeta);
    vid.addEventListener("durationchange", onMeta);
    return () => {
      vid.removeEventListener("loadedmetadata", onMeta);
      vid.removeEventListener("durationchange", onMeta);
    };
  }, [aiClipUrl]);

  // Set duration based on mode
  useEffect(() => {
    if (viewMode === "ai-only") setDuration(aiClipDuration);
    else if (viewMode === "original-only") setDuration(originalDuration);
    else setDuration(splicedTotal);
  }, [viewMode, aiClipDuration, originalDuration, splicedTotal]);

  /* ─── Phase management for spliced playback ─── */
  useEffect(() => {
    if (!hasSplice || viewMode !== "spliced") return;

    const video = originalVideoRef.current;
    if (!video) return;

    // Cut 0.3s BEFORE the chosen timestamp so the viewer doesn't see
    // the original product at peak visibility right before the switch.
    const cutPoint = Math.max(0, insertAtTimestamp - 0.3);

    const check = () => {
      if (
        phase === "original-before" &&
        video.currentTime >= cutPoint
      ) {
        video.pause();
        setPhase("ai-clip");
      }
    };

    // Poll every 50ms for tighter timing (was 200ms)
    const interval = setInterval(check, 50);
    return () => clearInterval(interval);
  }, [phase, insertAtTimestamp, hasSplice, viewMode]);

  // When phase switches to ai-clip → play the AI video & pre-position original for smooth return
  useEffect(() => {
    if (phase === "ai-clip" && aiVideoRef.current) {
      aiVideoRef.current.currentTime = 0;
      aiVideoRef.current.play().catch(() => undefined);
      setShowOverlay(true);

      // Pre-position original video AHEAD by the AI clip duration.
      // This way, when the crossfade back happens, the original shows a LATER
      // frame — the product naturally "cuts away" instead of vanishing.
      if (originalVideoRef.current) {
        const resumeAt = Math.min(
          insertAtTimestamp + aiClipDuration,
          originalVideoRef.current.duration || insertAtTimestamp + 5,
        );
        originalVideoRef.current.currentTime = resumeAt;
      }
    }
  }, [phase, insertAtTimestamp, aiClipDuration]);

  // When AI clip ends → cut back to original video at a LATER point
  const handleAiClipEnded = useCallback(() => {
    setPhase("original-after");
    setShowOverlay(false);

    const video = originalVideoRef.current;
    if (video) {
      // Skip ahead in the original so the product doesn't "vanish" at the same frame.
      // The AI clip replaces aiClipDuration seconds of the original video.
      const resumeAt = Math.min(insertAtTimestamp + aiClipDuration, video.duration || insertAtTimestamp + 5);
      video.currentTime = resumeAt;
      video.play().catch(() => undefined);
    }
  }, [insertAtTimestamp, aiClipDuration]);

  /* ─── Fallback: single-video overlay mode (no AI clip) ─── */
  useEffect(() => {
    if (hasSplice) return;

    const timer = setInterval(() => {
      const video = originalVideoRef.current;
      if (!video || hasTriggeredOverlay) return;

      if (Math.abs(video.currentTime - adSlot.timestamp) <= 0.5) {
        video.pause();
        setShowOverlay(true);
        setHasTriggeredOverlay(true);
      }
    }, 400);

    return () => clearInterval(timer);
  }, [hasSplice, adSlot.timestamp, hasTriggeredOverlay]);

  /* ─── Controls ─── */
  const handleCloseOverlay = () => {
    setShowOverlay(false);
    if (hasSplice && phase === "ai-clip") return;
    originalVideoRef.current?.play().catch(() => undefined);
  };

  const handleReplay = () => {
    setPhase("original-before");
    setShowOverlay(false);
    setHasTriggeredOverlay(false);
    setIsPlaying(false);

    const original = originalVideoRef.current;
    if (original) {
      original.currentTime = 0;
      original.play().catch(() => undefined);
    }
  };

  const handlePlay = () => {
    if (phase === "ai-clip" && aiVideoRef.current) {
      aiVideoRef.current.play().catch(() => undefined);
    } else {
      originalVideoRef.current?.play().catch(() => undefined);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (phase === "ai-clip" && aiVideoRef.current) {
      aiVideoRef.current.pause();
    } else {
      originalVideoRef.current?.pause();
    }
    setIsPlaying(false);
  };

  const togglePlay = () => (isPlaying ? handlePause() : handlePlay());

  /* ─── Seek handler ─── */
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (viewMode === "original-only") {
      const target = pct * originalDuration;
      if (originalVideoRef.current) originalVideoRef.current.currentTime = target;
      setCurrentTime(target);
      return;
    }

    if (viewMode === "ai-only") {
      const target = pct * aiClipDuration;
      if (aiVideoRef.current) aiVideoRef.current.currentTime = target;
      setCurrentTime(target);
      return;
    }

    // Spliced mode — map click position to the right phase + video
    const target = pct * splicedTotal;

    if (target < insertAtTimestamp) {
      // Seeking into "original-before"
      originalVideoRef.current?.pause();
      aiVideoRef.current?.pause();
      setPhase("original-before");
      setShowOverlay(false);
      if (originalVideoRef.current) {
        originalVideoRef.current.currentTime = target;
        if (isPlaying) originalVideoRef.current.play().catch(() => undefined);
      }
      setCurrentTime(target);
    } else if (target < insertAtTimestamp + aiClipDuration) {
      // Seeking into "ai-clip"
      originalVideoRef.current?.pause();
      setPhase("ai-clip");
      setShowOverlay(true);
      const aiTime = target - insertAtTimestamp;
      if (aiVideoRef.current) {
        aiVideoRef.current.currentTime = aiTime;
        if (isPlaying) aiVideoRef.current.play().catch(() => undefined);
      }
      setCurrentTime(aiTime);
    } else {
      // Seeking into "original-after" — maps to (insertAt + aiClipDuration) onward in original
      aiVideoRef.current?.pause();
      setPhase("original-after");
      setShowOverlay(false);
      const afterResumePoint = Math.min(insertAtTimestamp + aiClipDuration, originalDuration);
      const origTime = afterResumePoint + (target - insertAtTimestamp - aiClipDuration);
      if (originalVideoRef.current) {
        originalVideoRef.current.currentTime = origTime;
        if (isPlaying) originalVideoRef.current.play().catch(() => undefined);
      }
      setCurrentTime(origTime);
    }
  };

  /* ─── Which video is visible ─── */
  const showOriginal =
    viewMode === "original-only" ||
    (viewMode === "spliced" && phase !== "ai-clip");
  const showAiClip =
    viewMode === "ai-only" ||
    (viewMode === "spliced" && phase === "ai-clip");

  /* ─── Switch view mode ─── */
  const switchMode = (mode: ViewMode) => {
    originalVideoRef.current?.pause();
    aiVideoRef.current?.pause();
    setIsPlaying(false);
    setShowOverlay(false);
    setHasTriggeredOverlay(false);
    setPhase("original-before");
    setViewMode(mode);
    setCurrentTime(0);

    if (originalVideoRef.current) originalVideoRef.current.currentTime = 0;
    if (aiVideoRef.current) aiVideoRef.current.currentTime = 0;
  };

  /* ─── Timeline position for seekbar ─── */
  const timelinePos = viewMode === "spliced" ? getSplicedPosition() : currentTime;
  const timelineDur = duration || 1;
  const progressPct = Math.min(100, (timelinePos / timelineDur) * 100);

  /* ─── AI clip region markers for spliced seekbar ─── */
  const aiRegionStart = hasSplice && viewMode === "spliced"
    ? (insertAtTimestamp / splicedTotal) * 100
    : 0;
  const aiRegionWidth = hasSplice && viewMode === "spliced"
    ? (aiClipDuration / splicedTotal) * 100
    : 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      {/* View mode selector */}
      {hasSplice && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">View:</span>
          <button
            type="button"
            onClick={() => switchMode("spliced")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "spliced"
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Spliced (Original + AI)
          </button>
          <button
            type="button"
            onClick={() => switchMode("original-only")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "original-only"
                ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Original Only
          </button>
          <button
            type="button"
            onClick={() => switchMode("ai-only")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "ai-only"
                ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            AI Clip Only
          </button>
        </div>
      )}

      {/* Phase indicator — only visible in spliced mode */}
      {hasSplice && viewMode === "spliced" && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "original-before"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            Original
          </span>
          <span className="text-zinc-700">&rarr;</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "ai-clip"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            AI Ad
          </span>
          <span className="text-zinc-700">&rarr;</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "original-after"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            Original
          </span>
        </div>
      )}

      {/* ─── Video area ─── */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800">
        {/* Original video — always rendered for sizing, opacity controls visibility */}
        <video
          ref={originalVideoRef}
          src={originalVideoUrl}
          muted
          className={`h-auto w-full bg-black transition-opacity duration-[50ms] ease-linear ${
            showOriginal ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* AI clip video — absolute overlay with crossfade */}
        {aiClipUrl && (
          <video
            ref={aiVideoRef}
            src={aiClipUrl}
            muted
            className={`absolute inset-0 h-full w-full object-contain bg-black transition-opacity duration-[50ms] ease-linear ${
              showAiClip ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            playsInline
            onEnded={viewMode === "spliced" ? handleAiClipEnded : undefined}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Scrim when overlay is showing */}
        {showOverlay && (
          <div className="pointer-events-none absolute inset-0 bg-black/20 transition-opacity duration-300" />
        )}

        {/* Shoppable bubble */}
        {viewMode !== "original-only" && (
          <ShoppableBubble
            visible={showOverlay}
            productName={adSlot.productName}
            imageUrl={adSlot.productImageUrl}
            buyUrl={adSlot.buyUrl}
            onClose={handleCloseOverlay}
            position={adSlot.placement}
          />
        )}

        {/* Click-to-play overlay when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <svg className="h-8 w-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* ─── Custom control bar ─── */}
      <div className="mt-3 space-y-2">
        {/* Seekbar */}
        <div
          className="group relative h-2 w-full cursor-pointer rounded-full bg-zinc-800"
          onClick={handleSeek}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
        >
          {/* AI clip region highlight (spliced mode) */}
          {hasSplice && viewMode === "spliced" && (
            <div
              className="absolute top-0 h-full rounded-full bg-emerald-900/40"
              style={{ left: `${aiRegionStart}%`, width: `${aiRegionWidth}%` }}
            />
          )}

          {/* Progress fill */}
          <div
            className="absolute top-0 h-full rounded-full bg-blue-500 transition-[width] duration-150"
            style={{ width: `${progressPct}%` }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 transition"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Replay */}
          <button
            type="button"
            onClick={handleReplay}
            className="flex h-8 items-center gap-1 rounded-lg border border-zinc-700 px-2.5 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 transition"
            title="Replay from start"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.36-5.36M20 15a9 9 0 01-15.36 5.36" />
            </svg>
          </button>

          {/* Time display */}
          <span className="font-mono text-zinc-300 tabular-nums">
            {fmt(timelinePos)} <span className="text-zinc-600">/</span> {fmt(timelineDur)}
          </span>

          {/* Phase label (spliced mode) */}
          {hasSplice && viewMode === "spliced" && (
            <span className="ml-auto">
              {phase === "original-before" && `Original → AI ad at ${insertAtTimestamp.toFixed(1)}s`}
              {phase === "ai-clip" && "Playing AI placement clip"}
              {phase === "original-after" && "Original (after ad)"}
            </span>
          )}

          {/* Mode label (non-spliced) */}
          {hasSplice && viewMode !== "spliced" && (
            <span className="ml-auto text-zinc-500">
              {viewMode === "original-only" ? "Original video" : "AI-generated clip"}
            </span>
          )}

          {/* Non-splice mode label */}
          {!hasSplice && (
            <span className="ml-auto text-zinc-500">
              Ad triggers at {adSlot.timestamp.toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* AI disclosure */}
      <div className="mt-2 flex justify-end">
        <span className="rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500">
          AI-enhanced placement
        </span>
      </div>
    </div>
  );
}
```

---

## `components/VideoHistory.tsx`

```tsx
"use client";

import { useState } from "react";
import { VibePlayer, type AdSlot } from "@/components/VibePlayer";
import { Watermark } from "@/components/Watermark";
import { Video, Clock, Package, Calendar, Eye, ChevronDown, ChevronUp } from "lucide-react";

type VideoRecord = {
  id: string;
  source_video_url: string;
  processed_video_url: string;
  ad_slot: AdSlot;
  status: "processing" | "ready" | "failed";
  prompt_context: string | null;
  created_at: string;
};

type VideoHistoryProps = {
  videos: VideoRecord[];
  plan: string;
};

const statusConfig = {
  processing: { label: "Processing", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  ready: { label: "Ready", color: "bg-[#36A64F]/10 text-[#36A64F] border-[#36A64F]/30" },
  failed: { label: "Failed", color: "bg-[#FF6363]/10 text-[#FF6363] border-[#FF6363]/30" },
} as const;

export function VideoHistory({ videos, plan }: VideoHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (videos.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-black/10 bg-white/40 p-10 text-center">
        <Video className="mx-auto h-10 w-10 text-black/20" />
        <p className="mt-4 text-lg font-['Space_Grotesk'] font-medium text-black/50">No videos yet</p>
        <p className="mt-1 text-sm text-black/30">
          Process your first video above to see it here.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {videos.map((video) => {
        const st = statusConfig[video.status];
        const isExpanded = expandedId === video.id;
        const isFree = plan === "free";

        return (
          <article
            key={video.id}
            className="overflow-hidden rounded-2xl border border-black/10 bg-white/60 transition-colors hover:border-black/20"
          >
            {/* Card header — always visible */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : video.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              {/* Status dot */}
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.color}`}>
                {st.label}
              </span>

              {/* Product name */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Package className="h-4 w-4 shrink-0 text-black/30" />
                <span className="truncate font-medium text-black">
                  {video.ad_slot.productName || "Untitled"}
                </span>
              </div>

              {/* Timestamp */}
              <div className="hidden items-center gap-1.5 text-sm text-black/50 font-['Space_Mono'] sm:flex">
                <Clock className="h-3.5 w-3.5" />
                <span>{video.ad_slot.timestamp.toFixed(1)}s</span>
              </div>

              {/* Created date */}
              <div className="hidden items-center gap-1.5 text-sm text-black/40 md:flex">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(video.created_at).toLocaleDateString()}</span>
              </div>

              {/* Expand icon */}
              <div className="flex items-center gap-1 text-xs text-black/30">
                <Eye className="h-3.5 w-3.5" />
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {/* Expanded: VibePlayer */}
            {isExpanded && video.status === "ready" && (() => {
              const hasAiClip = video.processed_video_url !== video.source_video_url;
              const originalIsBroken = video.source_video_url.startsWith("blob:");

              // If we have an AI clip but the original is a dead blob URL,
              // just show the AI clip directly as a standalone video
              if (hasAiClip && originalIsBroken) {
                return (
                  <div className="border-t border-black/10 bg-black/5 p-4">
                    <div className="relative mx-auto max-w-2xl">
                      <video
                        src={video.processed_video_url}
                        controls
                        playsInline
                        className="w-full rounded-xl bg-black"
                      />
                      <Watermark visible={isFree} />
                    </div>
                  </div>
                );
              }

              // Normal case: both URLs are valid
              return (
                <div className="border-t border-black/10 bg-black/5 p-4">
                  <div className="relative mx-auto max-w-2xl">
                    <VibePlayer
                      originalVideoUrl={video.source_video_url}
                      aiClipUrl={hasAiClip ? video.processed_video_url : null}
                      insertAtTimestamp={video.ad_slot.timestamp}
                      adSlot={video.ad_slot}
                    />
                    <Watermark visible={isFree} />
                  </div>
                </div>
              );
            })()}

            {/* Expanding a failed video */}
            {isExpanded && video.status === "failed" && (
              <div className="border-t border-black/10 bg-[#FF6363]/5 p-6 text-center">
                <p className="text-sm text-[#FF6363]">Processing failed. Try running this video again.</p>
              </div>
            )}

            {/* Expanding a processing video */}
            {isExpanded && video.status === "processing" && (
              <div className="border-t border-black/10 bg-black/5 p-6 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
                <p className="mt-3 text-sm text-black/50">Still processing — check back soon.</p>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
```

---

## `components/VideoWorkflowPanel.tsx`

```tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  processVideoAction,
  type ProcessVideoResult,
} from "@/app/actions/process-video";
import { VibePlayer } from "./VibePlayer";
import { Watermark } from "./Watermark";

/* ═══════════════════════════  Types  ═══════════════════════════════ */

type FormInput = {
  sourceVideoUrl: string;
  productDescription: string;
  productImageUrl: string;
  buyUrl: string;
};

type FrameSample = {
  dataUrl: string;
  timestamp: number;
  width: number;
  height: number;
};

/* ═══════════════════════════  Config  ══════════════════════════════ */

const NUM_SAMPLES = 12; // frames to sample for Director — more = better coverage
const MAX_VIDEO_SECONDS = 30;

const DEMO_PRODUCT_DESCRIPTION = `Nike offers a wide range of high-quality shoes, from performance running sneakers to stylish lifestyle options like Air Force 1 and Dunks.

Popular Models
Iconic lines include Air Max for cushioning, Dunk Low for streetwear, and Air Force 1 for everyday versatility. These models feature advanced tech like springy foam midsoles and breathable materials for comfort during workouts or casual wear`;

const DEMO_BUY_URL = "https://www.nike.com/t/reactx-rejuven8-big-kids-shoes-xplp2HHG/IF1746-300";

const defaultInput: FormInput = {
  sourceVideoUrl: "",
  productDescription: "",
  productImageUrl: "",
  buyUrl: "",
};

/* ═══════════════  Frame sampling utility  ═════════════════════════ */

function extractFrameAtTime(
  video: HTMLVideoElement,
  timestamp: number,
  maxDim = 768,
): Promise<FrameSample | null> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener("seeked", handler);
      try {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) { resolve(null); return; }

        const scale = Math.min(maxDim / vw, maxDim / vh, 1);
        const cw = Math.round(vw * scale);
        const ch = Math.round(vh * scale);

        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(video, 0, 0, cw, ch);

        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.75),
          timestamp,
          width: cw,
          height: ch,
        });
      } catch {
        resolve(null);
      }
    };

    video.addEventListener("seeked", handler);
    video.currentTime = timestamp;
  });
}

async function sampleFrames(
  videoUrl: string,
  numSamples: number = NUM_SAMPLES,
): Promise<FrameSample[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) { resolve([]); return; }

      const frames: FrameSample[] = [];
      // Sample evenly across the video (skip very start and very end)
      const start = Math.max(0.5, duration * 0.05);
      const end = duration * 0.95;
      const step = (end - start) / Math.max(numSamples - 1, 1);

      for (let i = 0; i < numSamples; i++) {
        const ts = start + step * i;
        const frame = await extractFrameAtTime(video, ts);
        if (frame) frames.push(frame);
      }

      resolve(frames);
    };

    video.onerror = () => resolve([]);
    video.src = videoUrl;
    video.load();
  });
}

function isYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function isMp4Url(url: string): boolean {
  return /\.mp4($|\?|#)/i.test(url) || /^blob:/i.test(url);
}

function isImageUrl(url: string): boolean {
  return /^https?:\/\/.+\.(png|jpe?g|webp|avif)($|\?|#)/i.test(url) || /^blob:/i.test(url);
}

async function getVideoDuration(videoUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const duration = video.duration;
      resolve(isFinite(duration) ? duration : null);
    };

    video.onerror = () => resolve(null);
    video.src = videoUrl;
    video.load();
  });
}

/* ═══════════════════════════  Component  ═══════════════════════════ */

export function VideoWorkflowPanel({ plan = "free" }: { plan?: string }) {
  const [input, setInput] = useState<FormInput>(defaultInput);
  const [result, setResult] = useState<ProcessVideoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sampledFrames, setSampledFrames] = useState<FrameSample[]>([]);
  const [isSampling, setIsSampling] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [friendlyStep, setFriendlyStep] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const friendlyRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const uploadedBlobUrlRef = useRef<string | null>(null);
  const uploadedImageBlobUrlRef = useRef<string | null>(null);
  const uploadedVideoFileRef = useRef<File | null>(null);

  /* ── Campo helpers ── */
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLiveLogs((prev) => [...prev, `[${ts}] ${msg}`]);
    // Auto-scroll
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const set = (key: keyof FormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInput((p) => ({ ...p, [key]: e.target.value }));

  const handleMp4Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isMp4File = file.type === "video/mp4" || /\.mp4$/i.test(file.name);
    if (!isMp4File) {
      setError("Please upload an .mp4 file.");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const duration = await getVideoDuration(blobUrl);

    if (!duration) {
      URL.revokeObjectURL(blobUrl);
      setError("Could not read uploaded video metadata.");
      return;
    }

    if (duration > MAX_VIDEO_SECONDS) {
      URL.revokeObjectURL(blobUrl);
      setError(`Uploaded video is ${duration.toFixed(1)}s. Max allowed length is ${MAX_VIDEO_SECONDS}s.`);
      return;
    }

    if (uploadedBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedBlobUrlRef.current);
    }
    uploadedBlobUrlRef.current = blobUrl;
    uploadedVideoFileRef.current = file;
    setUploadedFileName(file.name);
    setError(null);
    setInput((p) => ({ ...p, sourceVideoUrl: blobUrl }));
  };

  const clearUpload = () => {
    if (uploadedBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedBlobUrlRef.current);
      uploadedBlobUrlRef.current = null;
    }
    uploadedVideoFileRef.current = null;
    setUploadedFileName("");
    setSampledFrames([]);
    lastSampledUrl.current = "";
    setInput((p) => ({ ...p, sourceVideoUrl: "" }));
  };

  const isUpload = !!uploadedFileName;

  /* ── Image upload helpers ── */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValid = /\.(png|jpe?g|webp|avif)$/i.test(file.name) ||
      ["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type);
    if (!isValid) {
      setError("Please upload a .jpg, .png, .webp, or .avif image.");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    if (uploadedImageBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedImageBlobUrlRef.current);
    }
    uploadedImageBlobUrlRef.current = blobUrl;
    setUploadedImageName(file.name);
    setError(null);
    setInput((p) => ({ ...p, productImageUrl: blobUrl }));
  };

  const clearImageUpload = () => {
    if (uploadedImageBlobUrlRef.current) {
      URL.revokeObjectURL(uploadedImageBlobUrlRef.current);
      uploadedImageBlobUrlRef.current = null;
    }
    setUploadedImageName("");
    setInput((p) => ({ ...p, productImageUrl: "" }));
  };

  const isImageUpload = !!uploadedImageName;

  /* ── Auto-sample frames when video URL changes ── */
  const lastSampledUrl = useRef("");

  const doSampleFrames = useCallback(async (url: string) => {
    if (!url || url === lastSampledUrl.current) return;
    if (isYoutubeUrl(url)) {
      setError("YouTube links are not supported yet. Please use a direct .mp4 URL (max 30 seconds).");
      setSampledFrames([]);
      return;
    }
    if (!isMp4Url(url)) {
      setError("Please use a direct .mp4 URL (YouTube pages and other formats are not supported yet).");
      setSampledFrames([]);
      return;
    }
    lastSampledUrl.current = url;
    setIsSampling(true);
    setSampledFrames([]);
    setError(null);
    try {
      const duration = await getVideoDuration(url);
      if (!duration) {
        setError("Could not read video metadata. Please use a public direct .mp4 URL.");
        return;
      }
      if (duration > MAX_VIDEO_SECONDS) {
        setError(`Video is ${duration.toFixed(1)}s. Max allowed length is ${MAX_VIDEO_SECONDS}s.`);
        return;
      }

      const frames = await sampleFrames(url);
      setSampledFrames(frames);
      console.log(`[UI] Sampled ${frames.length} frames from video`);
    } catch {
      setSampledFrames([]);
    } finally {
      setIsSampling(false);
    }
  }, []);

  // Debounced sampling on URL change
  useEffect(() => {
    if (!input.sourceVideoUrl) return;
    const timer = setTimeout(() => doSampleFrames(input.sourceVideoUrl), 800);
    return () => clearTimeout(timer);
  }, [input.sourceVideoUrl, doSampleFrames]);

  useEffect(() => {
    return () => {
      if (uploadedBlobUrlRef.current) {
        URL.revokeObjectURL(uploadedBlobUrlRef.current);
      }
      if (uploadedImageBlobUrlRef.current) {
        URL.revokeObjectURL(uploadedImageBlobUrlRef.current);
      }
    };
  }, []);

  /* ── Submit ── */
  async function handleSubmit() {
    if (!input.sourceVideoUrl) {
      setError("Please upload a video file first.");
      return;
    }

    if (!input.productDescription?.trim()) {
      setError("Product description is required — the AI Director needs to know what to place!");
      return;
    }
    if (!input.productImageUrl?.trim()) {
      setError("Please upload a reference product image.");
      return;
    }

    const duration = await getVideoDuration(input.sourceVideoUrl);
    if (!duration) {
      setError("Could not read video metadata. Please use a public direct .mp4 URL.");
      return;
    }
    if (duration > MAX_VIDEO_SECONDS) {
      setError(`Video is ${duration.toFixed(1)}s. Max allowed length is ${MAX_VIDEO_SECONDS}s.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLiveLogs([]);
    setElapsedSec(600);
    setFriendlyStep(0);
    setProgressMsg("Starting pipeline …");

    // Start 10-minute countdown timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setElapsedSec(remaining);
    }, 1000);

    // Rotate friendly messages every 12 seconds
    friendlyRef.current = setInterval(() => {
      setFriendlyStep((prev) => prev + 1);
    }, 12000);

    addLog("Pipeline started");

    try {
      // If frames haven't been sampled yet, do it now
      let frames = sampledFrames;
      if (frames.length === 0) {
        setProgressMsg("Extracting video frames …");
        addLog("Extracting video frames …");
        frames = await sampleFrames(input.sourceVideoUrl);
        setSampledFrames(frames);
        addLog(`✓ Sampled ${frames.length} frames`);
      }

      // Convert blob image URL to base64 data URL (blob URLs can't be accessed by the server)
      // Also re-encodes as JPEG so OpenAI accepts it (AVIF is not supported by their API)
      let productImageForServer = input.productImageUrl;
      if (productImageForServer.startsWith("blob:")) {
        addLog("Converting uploaded image to JPEG …");
        try {
          productImageForServer = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext("2d");
              if (!ctx) { reject(new Error("Canvas context failed")); return; }
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/jpeg", 0.92));
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = productImageForServer;
          });
          addLog("✓ Image converted to JPEG");
        } catch {
          addLog("✗ FAILED to convert uploaded image");
          setError("Failed to read uploaded image. Please try again.");
          return;
        }
      }

      setProgressMsg("Sending to AI Director (GPT-4o) …");
      addLog("Sending frames + product brief to AI Director (GPT-4o) …");
      addLog("Director analyses video → picks placement → writes prompts");
      addLog("Then SDXL composites → Kling generates video (3-8 min)");

      // Upload local video file to Supabase storage for persistent URL
      let persistentVideoUrl = input.sourceVideoUrl;
      if (uploadedVideoFileRef.current && input.sourceVideoUrl.startsWith("blob:")) {
        addLog("Uploading video to cloud storage …");
        setProgressMsg("Uploading video …");
        try {
          const formData = new FormData();
          formData.append("file", uploadedVideoFileRef.current);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
          persistentVideoUrl = uploadData.url;
          addLog("✓ Video uploaded to cloud storage");
        } catch (uploadErr) {
          addLog("⚠ Cloud upload failed: " + (uploadErr instanceof Error ? uploadErr.message : "unknown"));
          addLog("Continuing with local reference (video history may not replay)");
        }
      }

      const res = await processVideoAction({
        sourceVideoUrl: persistentVideoUrl,
        productDescription: input.productDescription,
        productImageUrl: productImageForServer,
        buyUrl: input.buyUrl || undefined,
        frameSamples: frames,
      });

      // Log pipeline steps from the server result
      if (res.pipelineSteps?.length) {
        for (const step of res.pipelineSteps) {
          const icon = step.includes("fail") ? "✗" : "✓";
          addLog(`${icon} ${step}`);
        }
      }

      if (res.aiClipUrl) {
        addLog("Video generated successfully!");
      } else {
        addLog("Pipeline completed but no video was generated");
      }

      if (res.savedToSupabase) {
        addLog("✓ Saved to your library");
      }
      if (res.saveError) {
        addLog(`⚠ Save error: ${res.saveError}`);
      }

      setResult(res);
      setProgressMsg("Done!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pipeline failed.";
      addLog(`✗ ERROR: ${msg}`);
      setError(msg);
    } finally {
      if (progressRef.current) clearInterval(progressRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (friendlyRef.current) clearInterval(friendlyRef.current);
      setLoading(false);
      addLog("Pipeline finished");
    }
  }

  /* ═══════════════════  Render  ════════════════════════════════════ */

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* ── FORM ── */}
      <div className="bg-white/60 rounded-2xl p-6 space-y-5 border border-black/10">
        <h2 className="text-xl font-['Space_Grotesk'] font-bold text-black flex items-center gap-2">
          AI DIRECTOR PIPELINE
        </h2>
        <p className="text-sm font-['Inter'] text-black/50">
          Upload your video and product details — the AI Director will decide the
          perfect moment and position for natural product placement.
        </p>

        {/* One-click demo banner */}
        <div className="rounded-xl border border-[#36A64F]/30 bg-[#36A64F]/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-['Space_Grotesk'] font-bold text-[#36A64F]">Try a One-Click Demo</p>
            <p className="text-xs font-['Inter'] text-[#36A64F]/60 mt-0.5">
              Loads a sample video + product brief + product (Nike Shoes) image + link to the shoe. Just hit the green button to watch the full AI pipeline run!
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              // Reset previous state
              if (uploadedBlobUrlRef.current) { URL.revokeObjectURL(uploadedBlobUrlRef.current); uploadedBlobUrlRef.current = null; }
              if (uploadedImageBlobUrlRef.current) { URL.revokeObjectURL(uploadedImageBlobUrlRef.current); uploadedImageBlobUrlRef.current = null; }
              uploadedVideoFileRef.current = null;
              setUploadedFileName("");
              setUploadedImageName("");
              setSampledFrames([]);
              lastSampledUrl.current = "";
              setError(null);
              setResult(null);

              try {
                // Fetch demo video as a File
                const videoRes = await fetch("/loaddemo/demo.mp4");
                const videoBlob = await videoRes.blob();
                const videoFile = new File([videoBlob], "demo.mp4", { type: "video/mp4" });
                const videoBlobUrl = URL.createObjectURL(videoFile);
                uploadedBlobUrlRef.current = videoBlobUrl;
                uploadedVideoFileRef.current = videoFile;
                setUploadedFileName("demo.mp4");

                // Fetch demo image as a File
                const imageRes = await fetch("/loaddemo/nike.png");
                const imageBlob = await imageRes.blob();
                const imageBlobUrl = URL.createObjectURL(imageBlob);
                uploadedImageBlobUrlRef.current = imageBlobUrl;
                setUploadedImageName("nike.png");

                setInput({
                  sourceVideoUrl: videoBlobUrl,
                  productDescription: DEMO_PRODUCT_DESCRIPTION,
                  productImageUrl: imageBlobUrl,
                  buyUrl: DEMO_BUY_URL,
                });
              } catch {
                setError("Failed to load demo files. Please try again.");
              }
            }}
            disabled={loading}
            className="shrink-0 rounded-lg bg-[#36A64F] px-4 py-2 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 disabled:opacity-40 transition"
          >
            Load Demo
          </button>
        </div>

        {/* VIDEO UPLOAD */}
        <div>
          <label className="block text-sm font-['Space_Mono'] font-medium uppercase tracking-wider text-black/70 mb-2">
            Video *
          </label>

          <div className="rounded-lg border border-black/10 bg-white/50 p-3">
            <p className="text-xs font-['Inter'] text-black/40 mb-2">
              Upload an .mp4 file (max {MAX_VIDEO_SECONDS}s)
            </p>

            {!isUpload ? (
              <input
                type="file"
                accept="video/mp4,.mp4"
                onChange={handleMp4Upload}
                className="block w-full text-xs font-['Inter'] text-black/60 file:mr-3 file:rounded-md file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black hover:file:bg-black/20"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-['Inter'] text-[#36A64F]">Uploaded: {uploadedFileName}</span>
                <button
                  type="button"
                  onClick={clearUpload}
                  className="text-xs font-['Inter'] text-black/40 hover:text-black/60 underline underline-offset-2 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {isSampling && (
            <p className="text-xs font-['Inter'] text-[#36A64F]/70 mt-1 animate-pulse">
              Sampling frames from video …
            </p>
          )}
          {sampledFrames.length > 0 && !isSampling && (
            <p className="text-xs font-['Inter'] text-[#36A64F] mt-1">
              ✓ {sampledFrames.length} frames ready for AI Director
            </p>
          )}
        </div>

        {/* PRODUCT BRIEF */}
        <div>
          <label className="block text-sm font-['Space_Mono'] font-medium uppercase tracking-wider text-black/70 mb-2">
            Product Brief *
          </label>
          <textarea
            value={input.productDescription}
            onChange={set("productDescription")}
            rows={4}
            className="w-full rounded-lg bg-white border border-black/10 px-4 py-2.5 text-sm font-['Inter'] text-black placeholder-black/30 focus:border-[#36A64F] focus:ring-1 focus:ring-[#36A64F] transition resize-none"
            placeholder={"Tell the AI Director everything:\n• Brand & product name (e.g. \"Nike Air Max\")\n• What it looks like (e.g. \"green and white sneakers\")\n• Where it belongs (e.g. \"on someone's feet\")\n• The vibe (e.g. \"sporty, youthful, streetwear\")"}
          />
          <p className="text-xs font-['Inter'] text-black/40 mt-1">
            This is what the AI Director reads. The more you tell it — brand, appearance, mood, where it fits — the more natural the placement.
          </p>
        </div>

        {/* REFERENCE IMAGE */}
        <div>
          <label className="block text-sm font-['Space_Mono'] font-medium uppercase tracking-wider text-black/70 mb-2">
            Product Image *
          </label>

          <div className="rounded-lg border border-black/10 bg-white/50 p-3">
            <p className="text-xs font-['Inter'] text-black/40 mb-2">
              Upload a reference image of the product (.png, .jpg, .webp)
            </p>

            {!isImageUpload ? (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif"
                onChange={handleImageUpload}
                className="block w-full text-xs font-['Inter'] text-black/60 file:mr-3 file:rounded-md file:border-0 file:bg-black/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black hover:file:bg-black/20"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-['Inter'] text-[#36A64F]">Uploaded: {uploadedImageName}</span>
                <button
                  type="button"
                  onClick={clearImageUpload}
                  className="text-xs font-['Inter'] text-black/40 hover:text-black/60 underline underline-offset-2 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BUY LINK */}
        <div>
          <label className="block text-sm font-['Space_Mono'] font-medium uppercase tracking-wider text-black/50 mb-2">
            Buy Link <span className="text-black/30 normal-case tracking-normal font-['Inter'] font-normal">(optional — shown on Shop button)</span>
          </label>
          <input
            type="text"
            value={input.buyUrl}
            onChange={set("buyUrl")}
            className="w-full rounded-lg bg-white border border-black/10 px-4 py-2.5 text-sm font-['Inter'] text-black placeholder-black/30 focus:border-[#36A64F] focus:ring-1 focus:ring-[#36A64F] transition"
            placeholder="https://store.example.com/product"
          />
        </div>

        {/* SAMPLED FRAMES preview */}
        {sampledFrames.length > 0 && (
          <div>
            <p className="text-xs font-['Inter'] text-black/40 mb-2">
              Frames sampled for AI Director — it will choose the best one:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sampledFrames.map((f, i) => (
                <div key={i} className="shrink-0 relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.dataUrl}
                    alt={`Frame ${i + 1}`}
                    className="h-16 rounded-md border border-black/10 object-cover"
                  />
                  <span className="absolute bottom-0 left-0 text-[10px] bg-black/70 text-white px-1 rounded-tr">
                    {f.timestamp.toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          disabled={
            loading ||
            !input.sourceVideoUrl ||
            !input.productDescription?.trim() ||
            !input.productImageUrl?.trim()
          }
          className="w-full py-3 rounded-xl font-['Space_Mono'] text-sm font-bold uppercase tracking-wider text-white bg-[#36A64F] hover:bg-[#36A64F]/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "AI Director is working …" : "Let AI Director Place Product"}
        </button>
      </div>

      {/* ── LIVE LOG PANEL ── */}
      {(loading || liveLogs.length > 0) && (() => {
        const FRIENDLY_MESSAGES = [
          "I promise we'll get you your video before the song ends",
          "Cooking something up for you …",
          "Director is analyzing your video frame by frame …",
          "Finding the perfect moment for product placement …",
          "AI is brainstorming creative placements …",
          "Crafting a seamless product integration …",
          "Snipping the best frames for your product …",
          "Our AI director is setting up the shot …",
          "Inserting your product into the scene …",
          "Figuring out the most natural-looking placement …",
          "Stitching everything together beautifully …",
          "Almost there, adding the finishing touches …",
          "Patience pays off — this is going to look great …",
          "The AI is working its magic …",
          "Fine-tuning the placement for perfection …",
          "Wrapping up — your video is nearly ready …",
        ];
        // Show the first message for 20s, then cycle through the rest
        const currentMsg = elapsedSec >= 580
          ? FRIENDLY_MESSAGES[0]
          : FRIENDLY_MESSAGES[1 + (friendlyStep % (FRIENDLY_MESSAGES.length - 1))];
        const minutes = Math.floor(elapsedSec / 60);
        const seconds = elapsedSec % 60;

        return (
          <div className="bg-white/60 rounded-2xl p-6 border border-black/10 space-y-5">
            {/* Countdown timer */}
            {loading && (
              <div className="text-center space-y-1">
                <p className="text-xs font-['Space_Mono'] uppercase tracking-widest text-black/40">
                  Estimated time remaining
                </p>
                <p className="text-4xl font-['Space_Mono'] font-bold text-[#36A64F] tabular-nums">
                  {minutes}:{String(seconds).padStart(2, "0")}
                </p>
              </div>
            )}

            {/* Animated progress bar */}
            {loading && (
              <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#36A64F] h-1.5 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(2, ((600 - elapsedSec) / 600) * 100)}%` }}
                />
              </div>
            )}

            {/* Friendly rotating message */}
            {loading && (
              <div className="text-center py-3">
                <p
                  key={friendlyStep}
                  className="text-lg font-['Space_Grotesk'] font-medium text-black/70 animate-fade-in"
                >
                  {currentMsg}
                </p>
              </div>
            )}

            {/* Completion status (when done) */}
            {!loading && liveLogs.length > 0 && (
              <div className="text-center py-2">
                <p className="text-sm font-['Space_Mono'] text-black/50">
                  {liveLogs.some((l) => l.includes("✗") || l.includes("ERROR"))
                    ? "Something went wrong — check the error below"
                    : "All done! Your video is ready below"}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── ERROR ── */}
      {error && (
        <div className="bg-black/5 border border-black/10 rounded-xl p-4">
          <p className="text-sm font-['Inter'] text-black/60">{error}</p>
        </div>
      )}

      {/* ── RESULTS ── */}
      {result && (
        <div className="space-y-6">
          {/* Director's Decision */}
          {result.directorDecision && (
            <div className="bg-white/60 rounded-2xl p-6 border border-black/10 space-y-3">
              <h3 className="text-lg font-['Space_Grotesk'] font-semibold text-black flex items-center gap-2">
                🎯 AI Director&apos;s Decision
              </h3>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-black/50">Scene: </span>
                  <span className="text-black/80">
                    {result.directorDecision.sceneDescription}
                  </span>
                </div>
                <div>
                  <span className="text-black/50">Why this placement: </span>
                  <span className="text-black/80">
                    {result.directorDecision.placementRationale}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-black/40 font-['Space_Mono']">
                  <span>
                    Frame: #{result.directorDecision.chosenFrameIndex + 1} at{" "}
                    {result.directorDecision.chosenTimestamp.toFixed(1)}s
                  </span>
                  <span>
                    Region: ({(result.directorDecision.maskRegion.x * 100).toFixed(0)}%,{" "}
                    {(result.directorDecision.maskRegion.y * 100).toFixed(0)}%) →{" "}
                    {(result.directorDecision.maskRegion.w * 100).toFixed(0)}% ×{" "}
                    {(result.directorDecision.maskRegion.h * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Video Player */}
          {result.aiClipUrl && (
            <div className="relative">
              <VibePlayer
                originalVideoUrl={result.originalVideoUrl}
                aiClipUrl={result.aiClipUrl}
                insertAtTimestamp={result.insertAtTimestamp}
                adSlot={result.adSlot}
              />
              <Watermark visible={plan === "free"} />
            </div>
          )}

          {/* Pipeline info */}
          <div className="bg-white/60 rounded-xl p-4 border border-black/10">
            <p className="text-xs font-['Space_Mono'] uppercase tracking-wider text-black/40 mb-2">Pipeline steps</p>
            <div className="flex flex-wrap gap-2">
              {result.pipelineSteps.map((step, i) => (
                <span
                  key={i}
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    step.includes("fail")
                      ? "bg-[#FF6363]/10 text-[#FF6363]"
                      : "bg-[#36A64F]/10 text-[#36A64F]"
                  }`}
                >
                  {step}
                </span>
              ))}
            </div>
            {result.savedToSupabase && (
              <p className="text-xs text-[#36A64F] mt-2">✓ Saved to library</p>
            )}
            {result.saveError && (
              <p className="text-xs text-[#FF6363] mt-2">Save error: {result.saveError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## `components/Watermark.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

type WatermarkProps = {
  /** Show the watermark only for free-tier users */
  visible: boolean;
};

/**
 * Semi-transparent diagonal watermark overlay for free-plan videos.
 * Sits on top of the video player container.
 */
export function Watermark({ visible }: WatermarkProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
    >
      <div className="flex -rotate-12 flex-col items-center gap-3 select-none">
        <span className="text-5xl font-extrabold tracking-widest text-white/[0.12] sm:text-6xl">
          REVSLOT
        </span>
        <span className="text-sm font-medium tracking-[0.25em] text-white/[0.10]">
          FREE PLAN • UPGRADE TO REMOVE
        </span>
      </div>
    </motion.div>
  );
}
```

---

