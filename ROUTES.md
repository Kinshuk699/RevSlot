# RevSlot — Routes Manifest

## Pages (App Router)

| Route                          | Auth     | Description                                                              |
| ------------------------------ | -------- | ------------------------------------------------------------------------ |
| `/`                            | Public   | Landing page — hero, How It Works, Use Cases, Tech Stack, Pricing grid   |
| `/sign-in`                     | Public   | Clerk-hosted sign-in (catch-all `[[...sign-in]]`)                        |
| `/sign-up`                     | Public   | Clerk-hosted sign-up (catch-all `[[...sign-up]]`)                        |
| `/dashboard`                   | Private  | Main dashboard — plan stats, VideoWorkflowPanel, VideoHistory            |

## API Routes

| Route                          | Method | Auth     | Description                                                           |
| ------------------------------ | ------ | -------- | --------------------------------------------------------------------- |
| `/api/checkout`                | POST   | Private  | Creates a Stripe Checkout session; body `{ priceId }`                 |
| `/api/upload`                  | POST   | Private  | Uploads an MP4 to Supabase Storage; returns `{ url }` (rate-limited)  |
| `/api/webhook/stripe`          | POST   | Public*  | Stripe webhook — handles `checkout.session.completed` and `customer.subscription.deleted`. Verified via `stripe-signature` header. |

## Server Actions

| Action                         | File                            | Description                                                        |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------ |
| `processVideoAction`           | `app/actions/process-video.ts`  | Full AI pipeline: GPT-4o Director → Flux Kontext Max → Kling Video |
| `syncUserProfile`              | `app/actions/sync-user.ts`      | Upserts Clerk user into Supabase `profiles` table on first visit   |

## Middleware

| File              | Protects                                  | Allows               |
| ----------------- | ----------------------------------------- | -------------------- |
| `middleware.ts`   | `/dashboard(.*)`, `/api/checkout(.*)`, `/api/upload(.*)` | `/api/webhook(.*)` (public for Stripe) |

---

*Public routes marked with `*` use signature verification instead of session-based auth.
