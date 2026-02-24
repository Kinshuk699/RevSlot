import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { PricingGrid } from "@/components/PricingCard";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-16 sm:px-8 lg:px-10">
        {/* ─── Hero ─── */}
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold tracking-wide text-emerald-400">
            VIBE CODING HACKATHON 2026
          </span>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Rev<span className="text-emerald-400">Slot</span>
          </h1>
          <p className="mt-4 text-lg text-zinc-300 sm:text-xl">
            AI-Powered Visual Commerce — turn any video into a shoppable storefront
          </p>
          <p className="mt-2 max-w-xl text-sm text-zinc-500">
            Our AI Director analyzes your video, picks the perfect moment, and seamlessly places
            any product into the scene using generative AI. No editing skills needed.
          </p>

          {/* Social proof badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              GPT-4o Vision AI Director
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Flux Kontext Max Generation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Kling Video Animation
            </span>
          </div>

          {userId ? (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Get Started Free
              </Link>
              <Link
                href="/sign-in"
                className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
              >
                Sign In
              </Link>
            </div>
          )}
        </section>

        {/* ─── How it works ─── */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "01", title: "Upload Video", desc: "Drop in any video — social clip, vlog, or product shot." },
              { step: "02", title: "Add Product", desc: "Describe the product and provide a reference image." },
              { step: "03", title: "AI Magic", desc: "Our AI Director finds the perfect moment and generates a seamless placement." },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <span className="text-xs font-bold text-emerald-400">{item.step}</span>
                <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Use Cases / Social Proof ─── */}
        <section className="mt-20">
          <h2 className="mb-3 text-center text-2xl font-bold tracking-tight">
            Built for Every Creator
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-center text-sm text-zinc-400">
            Whether you&apos;re a solo influencer or a brand agency, RevSlot automates product placement at a fraction of the cost.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                emoji: "🎬",
                title: "Content Creators",
                desc: "Monetize your existing videos by inserting brand-native product placements — no reshoots, no manual editing.",
              },
              {
                emoji: "🛍️",
                title: "E-Commerce Brands",
                desc: "See your product in lifestyle scenes instantly. Generate shoppable video ads with a single click.",
              },
              {
                emoji: "📊",
                title: "Ad Agencies",
                desc: "Pitch product placement concepts in hours, not weeks. A/B test placements across different scenes and products.",
              },
            ].map((uc) => (
              <div key={uc.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
                <span className="text-3xl">{uc.emoji}</span>
                <h3 className="mt-3 text-lg font-semibold">{uc.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Tech Stack ─── */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            Powered by Cutting-Edge AI
          </h2>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { name: "GPT-4o Vision", role: "AI Director" },
              { name: "Flux Kontext Max", role: "Product Placement" },
              { name: "Kling Video", role: "Animation" },
              { name: "Fal.ai", role: "GPU Inference" },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
                <p className="text-sm font-semibold text-zinc-100">{t.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{t.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section id="pricing" className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Pricing</h2>
          <PricingGrid />
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
        Built for Vibe Coding Hackathon 2026
      </footer>
    </div>
  );
}
