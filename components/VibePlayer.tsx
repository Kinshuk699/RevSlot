"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ShoppableBubble } from "@/components/ShoppableBubble";

export type AdSlot = {
  timestamp: number;
  productName: string;
  productImageUrl: string;
  buyUrl: string;
  /** Where to place the product in the frame (0-1 range) */
  placement?: { x: number; y: number };
};

/**
 * Playback phases:
 * 1. "original-before" — playing the original video from 0 → insertAt
 * 2. "ai-clip"         — playing the AI-generated clip (with shoppable overlay)
 * 3. "original-after"  — playing the original video from insertAt onward
 *
 * If no AI clip is provided, falls back to single-video mode with overlay at timestamp.
 */
type PlayPhase = "original-before" | "ai-clip" | "original-after";

type VibePlayerProps = {
  /** URL of the original source video */
  originalVideoUrl: string;
  /** URL of the AI-generated product placement clip (null = overlay-only mode) */
  aiClipUrl: string | null;
  /** Timestamp in the original video where the AI clip should be inserted */
  insertAtTimestamp: number;
  adSlot: AdSlot;
};

export function VibePlayer({
  originalVideoUrl,
  aiClipUrl,
  insertAtTimestamp,
  adSlot,
}: VibePlayerProps) {
  const originalVideoRef = useRef<HTMLVideoElement | null>(null);
  const aiVideoRef = useRef<HTMLVideoElement | null>(null);

  const [phase, setPhase] = useState<PlayPhase>("original-before");
  const [showOverlay, setShowOverlay] = useState(false);
  const [hasTriggeredOverlay, setHasTriggeredOverlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const hasSplice = !!aiClipUrl;

  /* ─── Phase management for spliced playback ─── */

  // When original video reaches insertAtTimestamp → switch to AI clip
  useEffect(() => {
    if (!hasSplice) return;

    const video = originalVideoRef.current;
    if (!video) return;

    const check = () => {
      if (
        phase === "original-before" &&
        video.currentTime >= insertAtTimestamp
      ) {
        video.pause();
        setPhase("ai-clip");
      }
    };

    const interval = setInterval(check, 200);
    return () => clearInterval(interval);
  }, [phase, insertAtTimestamp, hasSplice]);

  // When phase switches to ai-clip → play the AI video
  useEffect(() => {
    if (phase === "ai-clip" && aiVideoRef.current) {
      aiVideoRef.current.currentTime = 0;
      aiVideoRef.current.play().catch(() => undefined);
      setShowOverlay(true);
    }
  }, [phase]);

  // When AI clip ends → switch back to original video
  const handleAiClipEnded = useCallback(() => {
    setPhase("original-after");
    setShowOverlay(false);

    const video = originalVideoRef.current;
    if (video) {
      video.currentTime = insertAtTimestamp;
      video.play().catch(() => undefined);
    }
  }, [insertAtTimestamp]);

  /* ─── Fallback: single-video overlay mode (no AI clip) ─── */
  useEffect(() => {
    if (hasSplice) return;

    const timer = setInterval(() => {
      const video = originalVideoRef.current;
      if (!video || hasTriggeredOverlay) return;

      if (Math.abs(video.currentTime - adSlot.timestamp) <= 0.5) {
        video.pause();
        setShowOverlay(true);
        setHasTriggeredOverlay(true);
      }
    }, 400);

    return () => clearInterval(timer);
  }, [hasSplice, adSlot.timestamp, hasTriggeredOverlay]);

  /* ─── Controls ─── */
  const handleCloseOverlay = () => {
    setShowOverlay(false);
    if (hasSplice && phase === "ai-clip") {
      // Let AI clip continue playing after closing bubble
      return;
    }
    originalVideoRef.current?.play().catch(() => undefined);
  };

  const handleReplay = () => {
    setPhase("original-before");
    setShowOverlay(false);
    setHasTriggeredOverlay(false);
    setIsPlaying(false);

    const original = originalVideoRef.current;
    if (original) {
      original.currentTime = 0;
      original.play().catch(() => undefined);
    }
  };

  const handlePlay = () => {
    if (phase === "ai-clip" && aiVideoRef.current) {
      aiVideoRef.current.play().catch(() => undefined);
    } else {
      originalVideoRef.current?.play().catch(() => undefined);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (phase === "ai-clip" && aiVideoRef.current) {
      aiVideoRef.current.pause();
    } else {
      originalVideoRef.current?.pause();
    }
    setIsPlaying(false);
  };

  /* ─── Which video is visible ─── */
  const showOriginal = phase !== "ai-clip";
  const showAiClip = phase === "ai-clip";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      {/* Phase indicator for splice mode */}
      {hasSplice && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "original-before"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            ▶ Original
          </span>
          <span className="text-zinc-700">→</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "ai-clip"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            🎬 AI Ad Clip
          </span>
          <span className="text-zinc-700">→</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "original-after"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            ▶ Original
          </span>
          <span className="ml-auto text-zinc-500">
            Ad spliced at {insertAtTimestamp.toFixed(1)}s
          </span>
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl border border-zinc-800">
        {/* Original video */}
        <video
          ref={originalVideoRef}
          src={originalVideoUrl}
          controls={!hasSplice}
          className={`h-auto w-full bg-black ${showOriginal ? "" : "hidden"}`}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* AI clip video (only rendered when we have one) */}
        {aiClipUrl && (
          <video
            ref={aiVideoRef}
            src={aiClipUrl}
            className={`h-auto w-full bg-black ${showAiClip ? "" : "hidden"}`}
            playsInline
            onEnded={handleAiClipEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Scrim when overlay is showing */}
        {showOverlay && (
          <div className="pointer-events-none absolute inset-0 bg-black/20 transition-opacity duration-300" />
        )}

        {/* Shoppable bubble */}
        <ShoppableBubble
          visible={showOverlay}
          productName={adSlot.productName}
          imageUrl={adSlot.productImageUrl}
          buyUrl={adSlot.buyUrl}
          onClose={handleCloseOverlay}
          position={adSlot.placement}
        />
      </div>

      {/* Custom controls for splice mode */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        {hasSplice ? (
          <>
            <button
              type="button"
              onClick={isPlaying ? handlePause : handlePlay}
              className="rounded-md border border-zinc-700 px-3 py-1.5 font-medium text-zinc-200 hover:border-zinc-500"
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              type="button"
              onClick={handleReplay}
              className="rounded-md border border-zinc-700 px-3 py-1.5 font-medium text-zinc-200 hover:border-zinc-500"
            >
              ↻ Replay
            </button>
            <span>
              {phase === "original-before" &&
                `Playing original → AI ad at ${insertAtTimestamp.toFixed(1)}s`}
              {phase === "ai-clip" && "🎬 Playing AI product placement clip"}
              {phase === "original-after" &&
                "Playing original (ad clip finished)"}
            </span>
          </>
        ) : (
          <>
            <span>Ad triggers at {adSlot.timestamp.toFixed(1)}s</span>
            <button
              type="button"
              onClick={handleReplay}
              className="rounded-md border border-zinc-700 px-2.5 py-1 font-medium text-zinc-200 hover:border-zinc-500"
            >
              Replay
            </button>
          </>
        )}
      </div>
    </div>
  );
}
