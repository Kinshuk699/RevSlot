"use client";

import { VibePlayer } from "@/components/VibePlayer";
import type { AdSlot } from "@/components/VibePlayer";

/*
 * Precomputed demo data from a real pipeline run.
 * These URLs point to assets already persisted in Supabase Storage.
 */
const DEMO_ORIGINAL_URL =
  "https://tuelvhjkiqqvaeyugunu.supabase.co/storage/v1/object/public/user-videos/user_3A5E0U7wkYVPkj2bi6dKTUbZCeN/1771970501783-friends.mp4";

const DEMO_AI_CLIP_URL =
  "https://tuelvhjkiqqvaeyugunu.supabase.co/storage/v1/object/public/user-videos/user_3A5E0U7wkYVPkj2bi6dKTUbZCeN/1771970779520-ai-clip.mp4";

const DEMO_AD_SLOT: AdSlot = {
  timestamp: 1.44160835,
  productName: "McDonald's",
  productImageUrl:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80",
  buyUrl: "https://mcdindia.com/",
  placement: { x: 0.4, y: 0.6 },
};

export function DemoPlayer() {
  return (
    <div className="relative">
      <VibePlayer
        originalVideoUrl={DEMO_ORIGINAL_URL}
        aiClipUrl={DEMO_AI_CLIP_URL}
        insertAtTimestamp={DEMO_AD_SLOT.timestamp}
        adSlot={DEMO_AD_SLOT}
      />
      {/* AI disclosure badge */}
      <div className="mt-2 text-center">
        <span className="inline-block rounded-full border border-black/10 bg-white/60 px-3 py-1 font-['Space_Mono'] text-[10px] uppercase tracking-widest text-black/40">
          AI-enhanced product placement
        </span>
      </div>
    </div>
  );
}
