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
