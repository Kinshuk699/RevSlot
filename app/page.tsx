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
            Vibe<span className="text-emerald-400">Slot</span>
          </h1>
          <p className="mt-4 text-lg text-zinc-300 sm:text-xl">
            AI-Powered Visual Commerce — turn any video into a shoppable storefront
          </p>
          <p className="mt-2 max-w-xl text-sm text-zinc-500">
            Our AI Director analyzes your video, picks the perfect moment, and seamlessly places
            any product into the scene using generative AI. No editing skills needed.
          </p>

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
