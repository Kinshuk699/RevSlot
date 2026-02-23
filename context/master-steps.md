# Master Execution Steps: VibeSlot

## Step 1: Project Initialization & Landing Page (0-2 Hours)

1. Initialize Next.js 15 project with `--typescript`, `--tailwind`, and `--app`.
2. Install dependencies: `clerk/nextjs`, `@supabase/supabase-js`, `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`.
3. Create `app/layout.tsx` with ClerkProvider and a Dark Mode theme.
4. Build `app/page.tsx`:
   - Hero Section: Title "VibeSlot", Subtitle "AI-Powered Visual Commerce".
   - Pricing Section: 3 cards ($0, $20, $100) exactly as per @saas-logic.md.
   - Footer: With "Built for Vibe Coding Hackathon 2026".

## Step 2: Database & Auth (2-4 Hours)

1. Create `lib/supabase.ts` for the client initialization.
2. Create `middleware.ts` to protect `/dashboard` and `/api` routes using Clerk `authMiddleware`.
3. Implement a "User Sync" Server Action: When a user logs in, check if they exist in the `profiles` table in Supabase; if not, create them.

## Step 3: The Interactive Video Player (4-8 Hours)

1. Create `components/VibePlayer.tsx` (Client Component).
2. Use a `<video>` tag with a `ref`.
3. Add a `useEffect` that runs `setInterval` every 500ms to check `video.currentTime`.
4. Logic: Compare `currentTime` with `ad_slot.timestamp`. If they match (+/- 0.5s):
   - `video.pause()`
   - Set state `showOverlay = true`
5. Create `components/ShoppableBubble.tsx`: A floating card with a product image, "Buy Now" button, and "Close" button.

## Step 4: AI Workflow Implementation (8-14 Hours)

1. Create `app/actions/process-video.ts`.
2. Use Twelve Labs API to search the video. For the demo, hardcode the search query to "cup" or "bottle".
3. Use the Twelve Labs result to get the `start_time`.
4. Create a Fal.ai request to `fast-sdxl-inpainting`.
   - Mask: Provide a mask coordinate based on the Twelve Labs detection.
   - Prompt: "A high-end [Brand] bottle, photorealistic, 8k, matching lighting."
5. Save the final `processed_video_url` and `ad_slot` data to Supabase.


## Step 4b: Quality & Consistency Check

1. When calling Fal.ai, use the `upscale: true` parameter to ensure the product isn't blurry.
2. Ensure the prompt includes the environment context (e.g., "A coffee mug on a dark wooden table in a dimly lit office").
3. Implement a "Retry" button on the dashboard in case the first AI generation looks "wonky."

## Step 5: Dashboard & Final Polish (14-20 Hours)

1. Build `app/dashboard/page.tsx`: A list of the user's videos with "Status" (Processing/Ready).
2. Integrate Stripe Checkout buttons in the pricing section to redirect to your Stripe dashboard links.
3. Add a "Watermark" component that overlays on the video if `user.plan === 'free'`.
