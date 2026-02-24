import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PricingGrid } from "@/components/PricingCard";
import { HeroAnimation } from "@/components/HeroAnimation";
import { HowItWorks } from "@/components/HowItWorks";
import { CreatorRibbons } from "@/components/CreatorRibbons";

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

      </main>

      {/* ─── How it works (carousel, full-bleed) ─── */}
      <HowItWorks />

      {/* ─── Built for Every Creator (ribbon boxes) ─── */}
      <CreatorRibbons />

      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 sm:px-8 lg:px-10">
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
