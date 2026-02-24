"use client";

import { useState } from "react";
import { VibePlayer, type AdSlot } from "@/components/VibePlayer";
import { Watermark } from "@/components/Watermark";
import { Video, Clock, Package, Calendar, Eye, ChevronDown, ChevronUp } from "lucide-react";

type VideoRecord = {
  id: string;
  source_video_url: string;
  processed_video_url: string;
  ad_slot: AdSlot;
  status: "processing" | "ready" | "failed";
  prompt_context: string | null;
  created_at: string;
};

type VideoHistoryProps = {
  videos: VideoRecord[];
  plan: string;
};

const statusConfig = {
  processing: { label: "Processing", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  ready: { label: "Ready", color: "bg-[#36A64F]/10 text-[#36A64F] border-[#36A64F]/30" },
  failed: { label: "Failed", color: "bg-[#FF6363]/10 text-[#FF6363] border-[#FF6363]/30" },
} as const;

export function VideoHistory({ videos, plan }: VideoHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (videos.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-black/10 bg-white/40 p-10 text-center">
        <Video className="mx-auto h-10 w-10 text-black/20" />
        <p className="mt-4 text-lg font-['Space_Grotesk'] font-medium text-black/50">No videos yet</p>
        <p className="mt-1 text-sm text-black/30">
          Process your first video above to see it here.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {videos.map((video) => {
        const st = statusConfig[video.status];
        const isExpanded = expandedId === video.id;
        const isFree = plan === "free";

        return (
          <article
            key={video.id}
            className="overflow-hidden rounded-2xl border border-black/10 bg-white/60 transition-colors hover:border-black/20"
          >
            {/* Card header — always visible */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : video.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              {/* Status dot */}
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.color}`}>
                {st.label}
              </span>

              {/* Product name */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Package className="h-4 w-4 shrink-0 text-black/30" />
                <span className="truncate font-medium text-black">
                  {video.ad_slot.productName || "Untitled"}
                </span>
              </div>

              {/* Timestamp */}
              <div className="hidden items-center gap-1.5 text-sm text-black/50 font-['Space_Mono'] sm:flex">
                <Clock className="h-3.5 w-3.5" />
                <span>{video.ad_slot.timestamp.toFixed(1)}s</span>
              </div>

              {/* Created date */}
              <div className="hidden items-center gap-1.5 text-sm text-black/40 md:flex">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(video.created_at).toLocaleDateString()}</span>
              </div>

              {/* Expand icon */}
              <div className="flex items-center gap-1 text-xs text-black/30">
                <Eye className="h-3.5 w-3.5" />
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {/* Expanded: VibePlayer */}
            {isExpanded && video.status === "ready" && (() => {
              const hasAiClip = video.processed_video_url !== video.source_video_url;
              const originalIsBroken = video.source_video_url.startsWith("blob:");

              // If we have an AI clip but the original is a dead blob URL,
              // just show the AI clip directly as a standalone video
              if (hasAiClip && originalIsBroken) {
                return (
                  <div className="border-t border-black/10 bg-black/5 p-4">
                    <div className="relative mx-auto max-w-2xl">
                      <video
                        src={video.processed_video_url}
                        controls
                        playsInline
                        className="w-full rounded-xl bg-black"
                      />
                      <Watermark visible={isFree} />
                    </div>
                  </div>
                );
              }

              // Normal case: both URLs are valid
              return (
                <div className="border-t border-black/10 bg-black/5 p-4">
                  <div className="relative mx-auto max-w-2xl">
                    <VibePlayer
                      originalVideoUrl={video.source_video_url}
                      aiClipUrl={hasAiClip ? video.processed_video_url : null}
                      insertAtTimestamp={video.ad_slot.timestamp}
                      adSlot={video.ad_slot}
                    />
                    <Watermark visible={isFree} />
                  </div>
                </div>
              );
            })()}

            {/* Expanding a failed video */}
            {isExpanded && video.status === "failed" && (
              <div className="border-t border-black/10 bg-[#FF6363]/5 p-6 text-center">
                <p className="text-sm text-[#FF6363]">Processing failed. Try running this video again.</p>
              </div>
            )}

            {/* Expanding a processing video */}
            {isExpanded && video.status === "processing" && (
              <div className="border-t border-black/10 bg-black/5 p-6 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
                <p className="mt-3 text-sm text-black/50">Still processing — check back soon.</p>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
