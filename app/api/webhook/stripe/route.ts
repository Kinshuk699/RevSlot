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
