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

    if (clerkUserId) {
      // Determine plan from the price
      const creatorPriceId = process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID;
      const studioPriceId = process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID;

      let plan = "creator"; // default upgrade
      if (priceId === studioPriceId) plan = "studio";
      else if (priceId === creatorPriceId) plan = "creator";

      await supabase
        .from("profiles")
        .update({ plan })
        .eq("clerk_user_id", clerkUserId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const clerkUserId = (subscription.metadata as Record<string, string>)?.clerkUserId;

    if (clerkUserId) {
      await supabase
        .from("profiles")
        .update({ plan: "free" })
        .eq("clerk_user_id", clerkUserId);
    }
  }

  return NextResponse.json({ received: true });
}
