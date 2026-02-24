import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { VideoWorkflowPanel } from "@/components/VideoWorkflowPanel";

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

export default async function CreatePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = getSupabaseServiceRoleClient();

  const [profileResult, videosResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan")
      .eq("clerk_user_id", userId)
      .maybeSingle(),
    supabase
      .from("videos")
      .select("id")
      .eq("clerk_user_id", userId),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to load profile: ${profileResult.error.message}`);
  }

  const plan = profileResult.data?.plan ?? "free";
  const used = videosResult.data?.length ?? 0;
  const limit = PLAN_LIMITS[plan] ?? 1;
  const canCreate = used < limit;

  return (
    <main className="min-h-screen bg-[#fffeec] px-6 py-14 text-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        {/* ─── Header ─── */}
        <header>
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight">
            Create New Video
          </h1>
          <p className="mt-2 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            Enter your video and product details — the AI Director will find the perfect moment for natural product placement.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1 font-['Space_Mono'] text-xs uppercase tracking-widest text-black/50">
              {PLAN_LABELS[plan] ?? plan} Plan
            </span>
            <span className="font-['Space_Mono'] text-xs text-black/40">
              {used} / {limit} videos used
            </span>
          </div>
        </header>

        {/* ─── Generator ─── */}
        {canCreate ? (
          <VideoWorkflowPanel plan={plan} />
        ) : (
          <section className="rounded-2xl border border-[#FF6363]/30 bg-[#FF6363]/5 p-8 text-center">
            <p className="font-['Space_Grotesk'] text-xl font-semibold text-[#FF6363]">
              Video limit reached
            </p>
            <p className="mt-2 text-sm text-black/60" style={{ fontFamily: "'Inter', sans-serif" }}>
              You&apos;ve used all {limit} video{limit > 1 ? "s" : ""} on the{" "}
              {PLAN_LABELS[plan]} plan.
            </p>
            <Link
              href="/#pricing"
              className="mt-5 inline-block rounded-lg bg-[#36A64F] px-6 py-2.5 font-['Space_Mono'] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 transition"
            >
              Upgrade Plan
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
