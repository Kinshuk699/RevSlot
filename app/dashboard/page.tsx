import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { VideoWorkflowPanel } from "@/components/VideoWorkflowPanel";
import { VideoHistory } from "@/components/VideoHistory";
import { Film, Crown, ArrowUpRight } from "lucide-react";

/* ─── Plan limits ─── */
const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  creator: 10,
  studio: 50,
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  creator: "Creator",
  studio: "Studio",
};

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = getSupabaseServiceRoleClient();

  // Fetch profile + videos in parallel
  const [profileResult, videosResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, created_at")
      .eq("clerk_user_id", userId)
      .maybeSingle(),
    supabase
      .from("videos")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to load profile: ${profileResult.error.message}`);
  }

  const plan = profileResult.data?.plan ?? "free";
  const videos = videosResult.data ?? [];
  const limit = PLAN_LIMITS[plan] ?? 1;
  const used = videos.length;
  const canCreate = used < limit;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-14 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        {/* ─── Header ─── */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-400">
              AI-powered product placement studio
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium hover:border-zinc-500"
          >
            Home <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        {/* ─── Stats row ─── */}
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
              <Crown className="h-3.5 w-3.5" />
              Plan
            </div>
            <p className="mt-2 text-2xl font-semibold capitalize text-zinc-100">
              {PLAN_LABELS[plan] ?? plan}
            </p>
            {plan === "free" && (
              <Link href="/#pricing" className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300">
                Upgrade →
              </Link>
            )}
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
              <Film className="h-3.5 w-3.5" />
              Videos Used
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {used} <span className="text-base font-normal text-zinc-500">/ {limit}</span>
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${
                  used >= limit ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
              Member Since
            </div>
            <p className="mt-2 text-lg font-medium text-zinc-200">
              {profileResult.data?.created_at
                ? new Date(profileResult.data.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </article>
        </section>

        {/* ─── New video workflow ─── */}
        {canCreate ? (
          <VideoWorkflowPanel plan={plan} />
        ) : (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
            <p className="text-lg font-semibold text-amber-300">Video limit reached</p>
            <p className="mt-1 text-sm text-zinc-400">
              You&apos;ve used all {limit} video{limit > 1 ? "s" : ""} on the {PLAN_LABELS[plan]} plan.
            </p>
            <Link
              href="/#pricing"
              className="mt-4 inline-block rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-black hover:bg-emerald-400"
            >
              Upgrade Plan
            </Link>
          </section>
        )}

        {/* ─── Video history ─── */}
        <div>
          <h2 className="mb-4 text-xl font-semibold tracking-tight">Your Videos</h2>
          <VideoHistory videos={videos} plan={plan} />
        </div>
      </div>
    </main>
  );
}
