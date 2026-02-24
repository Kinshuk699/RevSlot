import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { PricingGrid } from "@/components/PricingCard";

export default async function PricingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("clerk_user_id", userId)
    .single();

  const currentPlan = data?.plan ?? "free";

  return (
    <main className="min-h-screen bg-[#fffeec] px-6 py-14 text-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="text-center">
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight">
            Choose Your Plan
          </h1>
          <p className="mt-2 text-sm text-black/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            Upgrade to unlock more videos, remove watermarks, and get priority AI processing.
          </p>
        </header>

        <PricingGrid currentPlan={currentPlan} />
      </div>
    </main>
  );
}
