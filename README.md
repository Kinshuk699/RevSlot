# RevSlot — AI-Powered Product Placement for Any Video

RevSlot uses AI to automatically place products into any video — naturally, contextually, and shoppably. Upload a video, describe a product, and the AI Director finds the perfect moment, composites the product into the scene, and generates a seamless 5-second AI clip with a shoppable buy-now overlay.

## Live Demo

**https://revslot.onrender.com/**

## Team

- **Kinshuk Sahni** — kinshuk.sahni6@gmail.com

## Problem

Product placement today is stuck in the past. It takes weeks of VFX work, costs a fortune, and only the biggest studios can afford it. Meanwhile, creators sitting on hours of video content have no real way to turn that into brand revenue without awkward sponsorship reads.

RevSlot automates the whole thing. You give it a video, tell it what product to place, and it figures out the best frame, composites the product in with proper lighting and perspective, and generates a short AI clip of the character actually using it. The output is a shoppable video with a buy link baked in.

The bigger picture: imagine retroactively placing products into old TV shows, classic movies, or archived content that's just sitting there generating views but no ad revenue. A 2005 sitcom rerun could suddenly feature a 2026 product, naturally embedded in the scene. That's the future of marketing, and RevSlot is built to make it happen.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS v4, Framer Motion |
| **Auth** | Clerk |
| **Database & Storage** | Supabase (Postgres + Storage) |
| **AI Pipeline** | OpenAI GPT-4o Vision (AI Director), Fal.ai Flux Kontext Max (image compositing), Fal.ai Kling Video (video generation) |
| **Payments** | Stripe (Checkout + Webhooks) |
| **Hosting** | Render |

## How It Works

1. **Upload** — Paste a video URL or upload an `.mp4` file (max 30s), describe the product, and provide a reference image.
2. **AI Director** — GPT-4o Vision samples 12 frames across the video, picks the best moment and surface for natural placement, and writes detailed compositing instructions. The Director is product-type-aware (shoes go on feet, headphones on ears, drinks in hand).
3. **Generate** — Flux Kontext Max composites the product into the chosen frame with correct perspective, lighting, and shadows. Then Kling Video generates a seamless 5-second clip from that composite.
4. **Preview & Share** — The VibePlayer splices the AI clip into the original video at the exact timestamp, with a shoppable buy-now bubble overlay. Videos are saved to your dashboard history for replay.

## Key Features

- **One-click demo** pre-loaded with sample video + product for instant evaluation
- **Three-tier SaaS** (Free / Creator / Studio) with Stripe Checkout + webhook-driven plan management
- **AI Director** (GPT-4o Vision) — product-type-aware creative direction with transitional arrival states for natural animation
- **Pure generative placement** — the product is created from scratch by Flux Kontext Max, not pasted/composited
- **VibePlayer** — spliced playback with three view modes (spliced, original-only, AI-only), custom timeline, and seek support
- **Watermark overlay** on free-plan videos, removed on paid plans
- **Rate-limited upload API** (5 uploads/min per user) with persistent video storage on Supabase
- **AI-generated assets persisted** to own Supabase Storage (not dependent on fal.ai TTL)
- **Stripe `customer_id`** stored for reliable subscription downgrades on cancellation
- **OpenGraph & Twitter Card** meta tags for social sharing
- **Music player** (Innerbloom) in the nav bar for vibes

## Architecture

```
app/
├── page.tsx                    # Landing (hero, how-it-works, pricing)
├── demo/page.tsx               # Public precomputed demo (no auth required)
├── create/page.tsx             # Video generator (VideoWorkflowPanel)
├── dashboard/page.tsx          # Dashboard (plan stats, video history)
├── pricing/page.tsx            # Pricing page with current plan context
├── actions/
│   ├── process-video.ts        # Full AI pipeline server action
│   └── sync-user.ts            # Upserts Clerk user into Supabase
├── api/
│   ├── checkout/route.ts       # Stripe Checkout session creation
│   ├── upload/route.ts         # MP4 upload to Supabase Storage
│   └── webhook/stripe/route.ts # Stripe webhook handler
components/
├── VideoWorkflowPanel.tsx      # Main workflow: input → sampling → pipeline → player
├── VibePlayer.tsx              # Spliced video player with phase management
├── ShoppableBubble.tsx         # Shoppable CTA overlay
├── PricingCard.tsx             # Pricing cards with Stripe checkout
├── VideoHistory.tsx            # Dashboard video history with expand/play
├── AuthNav.tsx                 # Sticky nav with auth + music player
├── HeroAnimation.tsx           # Animated input→output ribbon on landing
├── HowItWorks.tsx              # 3-step visual guide
├── CreatorRibbons.tsx          # Use-case ribbon animations
└── Watermark.tsx               # Free-plan watermark overlay
lib/
├── stripe.ts                   # Stripe singleton client
└── supabase.ts                 # Supabase client (anon + service role)
middleware.ts                   # Clerk auth (protects dashboard, create, API)
schema.sql                      # Full Supabase DB schema (profiles, videos, storage)
```

## Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
OPENAI_API_KEY=
FAL_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID=
NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID=
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How to Test

1. Visit https://revslot.onrender.com/ and sign up with an email
2. Go to Dashboard → click **"Load Demo"** to pre-fill a sample video + Nike product
3. Click **"Let AI Director Place Product"** and watch the live pipeline logs
4. Pipeline runs ~3–8 minutes (GPT-4o → Flux Kontext Max → Kling Video)
5. Once done, the VibePlayer shows the original video with the AI clip spliced in
6. Toggle between "Spliced", "Original", and "AI Only" view modes
7. Check the shoppable buy-now bubble that appears during the AI clip

**If the live pipeline is unavailable** (cold start, rate limit, API downtime), visit the precomputed demo at [/demo](https://revslot.onrender.com/demo) to see a ready-made result instantly, no auth required.

## Database Schema

The full Supabase schema (profiles + videos tables, indexes, storage bucket config) is in [schema.sql](schema.sql). Run it in the Supabase SQL editor to reproduce the database locally.

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Site takes 20-30s to load | Render free-tier cold start | Wait for the initial load, subsequent requests are fast |
| Pipeline times out | Render request timeout or fal.ai queue delays | Try again, or visit [/demo](https://revslot.onrender.com/demo) for a precomputed result |
| AI clip shows 404 | fal.ai temporary URL expired before persistence | Re-run the pipeline; assets are now persisted to Supabase Storage |
| "Rate limit exceeded" on upload | More than 5 uploads in 60 seconds | Wait a minute and try again |

## Routes

See [ROUTES.md](ROUTES.md) for the full routes manifest.

## License

Built for the Vibe Coding Hackathon 2026.
