import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { VideoHistory } from "@/components/VideoHistory";
import { Film, Crown, Calendar, Plus } from "lucide-react";

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
    <main className="min-h-screen bg-[#fffeec] px-6 py-14 text-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        {/* ─── Header ─── */}
        <header>
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            Your AI product placement studio at a glance.
          </p>
        </header>

        {/* ─── Stats row ─── */}
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-black/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/40">
              <Crown className="h-3.5 w-3.5" />
              Plan
            </div>
            <p className="mt-2 font-['Space_Grotesk'] text-2xl font-semibold capitalize text-black">
              {PLAN_LABELS[plan] ?? plan}
            </p>
            {plan === "free" && (
              <Link href="/pricing" className="mt-2 inline-block font-['Space_Mono'] text-xs uppercase tracking-wider text-[#36A64F] hover:text-[#36A64F]/70 transition">
                Upgrade →
              </Link>
            )}
          </article>

          <article className="rounded-2xl border border-black/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/40">
              <Film className="h-3.5 w-3.5" />
              Videos Used
            </div>
            <p className="mt-2 font-['Space_Grotesk'] text-2xl font-semibold text-black">
              {used} <span className="text-base font-normal text-black/40">/ {limit}</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className={`h-full rounded-full transition-all ${
                  used >= limit ? "bg-[#FF6363]" : "bg-[#36A64F]"
                }`}
                style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-black/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/40">
              <Calendar className="h-3.5 w-3.5" />
              Member Since
            </div>
            <p className="mt-2 font-['Space_Grotesk'] text-lg font-medium text-black/80">
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

        {/* ─── Create CTA ─── */}
        {canCreate ? (
          <Link
            href="/create"
            className="group flex items-center justify-between rounded-2xl border-2 border-dashed border-[#36A64F]/30 bg-[#36A64F]/5 p-6 transition hover:border-[#36A64F]/50 hover:bg-[#36A64F]/10"
          >
            <div>
              <h2 className="font-['Space_Grotesk'] text-xl font-semibold text-black">
                Create New Video
              </h2>
              <p className="mt-1 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
                Upload a video, describe your product, and let the AI Director handle the rest.
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#36A64F] text-white transition group-hover:scale-110">
              <Plus className="h-6 w-6" />
            </div>
          </Link>
        ) : (
          <section className="rounded-2xl border border-[#FF6363]/30 bg-[#FF6363]/5 p-6 text-center">
            <p className="font-['Space_Grotesk'] text-lg font-semibold text-[#FF6363]">Video limit reached</p>
            <p className="mt-1 text-sm text-black/60" style={{ fontFamily: "'Inter', sans-serif" }}>
              You&apos;ve used all {limit} video{limit > 1 ? "s" : ""} on the {PLAN_LABELS[plan]} plan.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block rounded-lg bg-[#36A64F] px-5 py-2 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 transition"
            >
              Upgrade Plan
            </Link>
          </section>
        )}

        {/* ─── Video history ─── */}
        <div>
          <h2 className="mb-4 font-['Space_Grotesk'] text-xl font-semibold tracking-tight">Your Videos</h2>
          <VideoHistory videos={videos} plan={plan} />
        </div>
      </div>
    </main>
  );
}
