# RevSlot — AI-Powered Product Placement for Any Video

## Product Name
**RevSlot**

## One-Line Description
RevSlot uses AI to automatically place products into any video — naturally, contextually, and shoppably.

## Team Members
- **Kinshuk Sahni** — kinshuk.sahni6@gmail.com

## Live Deployment URL
https://revslot.onrender.com/

## GitHub Repository URL
https://github.com/Kinshuk699/RevSlot

## Problem Description
Brands spend millions on product placement, but it's manual, expensive, and only accessible to big studios. Creators have tons of video content but no easy way to monetize it through native product integration. RevSlot solves this by using an AI Director (GPT-4o Vision) to analyze any video, find the perfect moment and surface for product placement, then generates a photorealistic composite frame (Flux Kontext Max) and a seamless 5-second AI video clip (Kling Video) — all in one click. The result is a shoppable video with a natural-looking product placement and a buy-now CTA bubble, turning any video into a revenue opportunity.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4, Framer Motion
- **Auth**: Clerk
- **Database & Storage**: Supabase (Postgres + Storage)
- **AI Pipeline**: OpenAI GPT-4o Vision (AI Director), Fal.ai Flux Kontext Max (image compositing), Fal.ai Kling Video (video generation)
- **Payments**: Stripe (Checkout + Webhooks)
- **Hosting**: Render

## How It Works
1. **Upload** — Paste a video URL or upload an .mp4 file, describe the product, and provide a reference image.
2. **AI Director** — GPT-4o Vision samples 12 frames across the video, picks the best moment and surface for natural placement, and writes detailed compositing instructions.
3. **Generate** — Flux Kontext Max composites the product into the chosen frame, then Kling Video generates a seamless 5-second clip from that composite.
4. **Preview & Share** — The VibePlayer splices the AI clip into the original video at the exact timestamp, with a shoppable buy-now bubble overlay. Videos are saved to your dashboard history for replay.

## Key Features
- One-click demo pre-loaded with sample video + product for instant evaluation
- Three-tier SaaS plan system (Free / Creator / Studio) with Stripe Checkout
- Rate-limited upload API with persistent video storage on Supabase
- AI-generated assets persisted to own Supabase Storage (not dependent on fal.ai TTL)
- Stripe `customer_id` stored for reliable subscription downgrades
- OpenGraph and Twitter Card meta tags for sharing
- Full routes manifest in `ROUTES.md`

## How to Test
1. Visit https://revslot.onrender.com/ and sign up with an email
2. Go to Dashboard → click **"Load Demo"** to pre-fill sample video + product
3. Click **"Let AI Director Place Product"** and watch the live pipeline logs
4. Pipeline runs ~3–8 minutes (GPT-4o → Flux Kontext Max → Kling Video)
5. Once done, the VibePlayer shows the original video with the AI clip spliced in
