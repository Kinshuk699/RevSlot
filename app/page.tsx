import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-16 sm:px-8 lg:px-10">
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">VibeSlot</h1>
          <p className="mt-4 text-lg text-zinc-300 sm:text-xl">AI-Powered Visual Commerce</p>
          {userId ? (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
              >
                Sign Up
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

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="mt-2 text-3xl font-bold">$0</p>
            <ul className="mt-5 space-y-2 text-zinc-300">
              <li>1 Video</li>
              <li>Watermarked</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Creator</h2>
            <p className="mt-2 text-3xl font-bold">$20/mo</p>
            <ul className="mt-5 space-y-2 text-zinc-300">
              <li>10 Videos</li>
              <li>No Watermark</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-xl font-semibold">Studio</h2>
            <p className="mt-2 text-3xl font-bold">$100/mo</p>
            <ul className="mt-5 space-y-2 text-zinc-300">
              <li>50 Videos</li>
              <li>Priority AI</li>
            </ul>
          </article>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-400">
        Built for Vibe Coding Hackathon 2026
      </footer>
    </div>
  );
}
