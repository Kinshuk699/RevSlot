import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PricingGrid } from "@/components/PricingCard";
import { HeroAnimation } from "@/components/HeroAnimation";

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
            <span className="text-black/80">Don&apos;t edit,</span>{" "}
            <span className="italic text-[#36A64F]">just upload</span>
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
              Get Started Free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg border border-black/20 px-6 py-3 font-['Space_Mono'] text-sm font-bold uppercase tracking-wider text-black transition hover:border-black/40"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-4 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/30">
            Available free · No credit card required
          </p>
        </section>

        {/* ─── How it works ─── */}
        <section className="mt-20">
          <h2 className="mb-8 text-center font-['Space_Grotesk'] text-2xl font-bold tracking-tight">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "01", title: "Upload Video", desc: "Drop in any video — social clip, vlog, or product shot." },
              { step: "02", title: "Add Product", desc: "Describe the product and provide a reference image." },
              { step: "03", title: "AI Magic", desc: "Our AI Director finds the perfect moment and generates a seamless placement." },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-black/10 bg-white/50 p-6">
                <span className="font-['Space_Mono'] text-xs font-bold uppercase tracking-widest text-[#36A64F]">{item.step}</span>
                <h3 className="mt-2 font-['Space_Grotesk'] text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-black/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Use Cases / Social Proof ─── */}
        <section className="mt-20">
          <h2 className="mb-3 text-center font-['Space_Grotesk'] text-2xl font-bold tracking-tight">
            Built for Every Creator
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-center text-sm text-black/60">
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
              <div key={uc.title} className="rounded-2xl border border-black/10 bg-white/50 p-6 text-center">
                <span className="text-3xl">{uc.emoji}</span>
                <h3 className="mt-3 font-['Space_Grotesk'] text-lg font-semibold">{uc.title}</h3>
                <p className="mt-1 text-sm text-black/60">{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

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
