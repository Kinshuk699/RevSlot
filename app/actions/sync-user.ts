"use server";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

type SyncUserResult = {
  synced: boolean;
  created: boolean;
};

export async function syncUserProfile(clerkUserId?: string): Promise<SyncUserResult> {
  const { userId: authUserId } = await auth();
  const userId = clerkUserId ?? authUserId;

  if (!userId) {
    return { synced: false, created: false };
  }

  const supabase = getSupabaseServiceRoleClient();

  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read profile: ${readError.message}`);
  }

  if (existingProfile) {
    return { synced: true, created: false };
  }

  const { error: createError } = await supabase
    .from("profiles")
    .insert({ clerk_user_id: userId, plan: "free" });

  if (createError && createError.code !== "23505") {
    throw new Error(`Failed to create profile: ${createError.message}`);
  }

  return { synced: true, created: true };
}