import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { VibePlayer } from "@/components/VibePlayer";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, created_at")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-14 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-400">Step 2 checkpoint: auth + profile sync are active.</p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium hover:border-zinc-500"
          >
            Back to Home
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Clerk User ID</p>
            <p className="mt-3 break-all text-sm text-zinc-200">{userId}</p>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Current Plan</p>
            <p className="mt-3 text-2xl font-semibold text-zinc-100">{profile?.plan ?? "free"}</p>
            <p className="mt-2 text-sm text-zinc-400">
              Profile created: {profile?.created_at ? new Date(profile.created_at).toLocaleString() : "Not found"}
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-xl font-semibold">Interactive Vibe Player Demo</h2>
          <p className="mt-2 text-sm text-zinc-400">
            The player checks time every 500ms. Around 3.0s, the video pauses and a shoppable bubble appears.
          </p>

          <div className="mt-5">
            <VibePlayer
              videoUrl="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
              adSlot={{
                timestamp: 3,
                productName: "High-End Studio Bottle",
                productImageUrl:
                  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80",
                buyUrl: "https://stripe.com",
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
