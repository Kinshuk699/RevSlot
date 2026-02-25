# RevSlot

## Product Name
RevSlot

## One-Liner
AI product placement for any video — upload, place, and sell in one click.

## Team
- Kinshuk Sahni — kinshuk.sahni6@gmail.com

## Links
- Live: https://revslot.onrender.com/
- GitHub: https://github.com/Kinshuk699/RevSlot

## The Problem
Product placement is a huge revenue channel, think Coca-Cola in every TV show, Ray-Ban in Top Gun, but it's completely locked behind big-budget studios and weeks of manual VFX work. If you're a creator or a small brand, you're basically shut out.

I wanted to flip that. RevSlot lets anyone upload a video, describe a product, and get back a version where that product is naturally placed into the scene, with a shoppable buy link baked in. No editing skills needed, the whole thing runs on AI.

There's also a bigger play here: retroactive product placement. Imagine taking old TV reruns or classic movies that are still getting millions of views and inserting modern products into them, naturally, in context. A 2005 sitcom could feature a 2026 brand without anyone noticing it wasn't always there. That's untapped ad revenue sitting in every streaming library, and RevSlot is built to unlock it.

## How It Actually Works
You upload a short video (up to 30s) and tell RevSlot what product to place (e.g. "Nike sneakers") along with a reference image. The pipeline does the rest:

1. GPT-4o Vision looks at 12 frames sampled across the video and picks the best moment — it's smart about product types too (shoes go on feet, drinks go in hands, headphones around the neck).
2. Flux Kontext Max takes that frame and regenerates it with the product naturally in the scene — correct lighting, perspective, shadows. It's not a paste job, the product is generated from scratch.
3. Kling Video animates the edited frame into a 5-second clip showing the character actually interacting with the product.
4. The VibePlayer splices that AI clip back into the original video at the right timestamp, and a shoppable "Shop" bubble appears so viewers can buy.

## Tech Stack
- Next.js 15 (App Router) + React 19 + Tailwind v4 + Framer Motion
- Clerk for auth
- Supabase for Postgres DB + file storage
- OpenAI GPT-4o Vision, Fal.ai Flux Kontext Max, Fal.ai Kling Video
- Stripe for subscriptions (Checkout + Webhooks)
- Deployed on Render

## Testing It
1. Go to https://revslot.onrender.com/ and sign up
2. Hit "Load Demo" on the dashboard — this pre-fills a sample video and Nike product
3. Click "Let AI Director Place Product" and watch the logs
4. Takes about 3–8 min to run the full pipeline
5. VibePlayer shows the final result — toggle between spliced/original/AI-only views
