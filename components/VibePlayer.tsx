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

/** Which viewing mode the user has selected */
type ViewMode = "spliced" | "original-only" | "ai-only";

type VibePlayerProps = {
  /** URL of the original source video */
  originalVideoUrl: string;
  /** URL of the AI-generated product placement clip (null = overlay-only mode) */
  aiClipUrl: string | null;
  /** Timestamp in the original video where the AI clip should be inserted */
  insertAtTimestamp: number;
  adSlot: AdSlot;
};

/* ─── Time formatting helper ─── */
function fmt(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VibePlayer({
  originalVideoUrl,
  aiClipUrl,
  insertAtTimestamp,
  adSlot,
}: VibePlayerProps) {
  const originalVideoRef = useRef<HTMLVideoElement | null>(null);
  const aiVideoRef = useRef<HTMLVideoElement | null>(null);

  const [phase, setPhase] = useState<PlayPhase>("original-before");
  const [viewMode, setViewMode] = useState<ViewMode>("spliced");
  const [showOverlay, setShowOverlay] = useState(false);
  const [hasTriggeredOverlay, setHasTriggeredOverlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  /* ─── Timeline state ─── */
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aiClipDuration, setAiClipDuration] = useState(5);
  const [originalDuration, setOriginalDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const hasSplice = !!aiClipUrl;

  /* ─── Compute combined timeline for spliced mode ─── */
  // Total = before (0 → insertAt) + AI clip + after (insertAt → end)
  const splicedTotal = hasSplice
    ? insertAtTimestamp + aiClipDuration + Math.max(0, originalDuration - insertAtTimestamp)
    : originalDuration;

  const getSplicedPosition = useCallback((): number => {
    if (!hasSplice || viewMode !== "spliced") return currentTime;
    if (phase === "original-before") return currentTime;
    if (phase === "ai-clip") return insertAtTimestamp + currentTime;
    // original-after
    return insertAtTimestamp + aiClipDuration + (currentTime - insertAtTimestamp);
  }, [hasSplice, viewMode, phase, currentTime, insertAtTimestamp, aiClipDuration]);

  /* ─── Track time from active video ─── */
  useEffect(() => {
    if (isSeeking) return;

    const vid =
      phase === "ai-clip" ? aiVideoRef.current : originalVideoRef.current;
    if (!vid) return;

    const onTime = () => {
      setCurrentTime(vid.currentTime);
    };
    const onDur = () => {
      if (phase !== "ai-clip") {
        setOriginalDuration(vid.duration);
        if (!hasSplice) setDuration(vid.duration);
      }
    };

    vid.addEventListener("timeupdate", onTime);
    vid.addEventListener("loadedmetadata", onDur);
    vid.addEventListener("durationchange", onDur);
    return () => {
      vid.removeEventListener("timeupdate", onTime);
      vid.removeEventListener("loadedmetadata", onDur);
      vid.removeEventListener("durationchange", onDur);
    };
  }, [phase, isSeeking, hasSplice]);

  // Track AI clip duration
  useEffect(() => {
    const vid = aiVideoRef.current;
    if (!vid) return;
    const onMeta = () => setAiClipDuration(vid.duration || 5);
    vid.addEventListener("loadedmetadata", onMeta);
    vid.addEventListener("durationchange", onMeta);
    return () => {
      vid.removeEventListener("loadedmetadata", onMeta);
      vid.removeEventListener("durationchange", onMeta);
    };
  }, [aiClipUrl]);

  // Set duration based on mode
  useEffect(() => {
    if (viewMode === "ai-only") setDuration(aiClipDuration);
    else if (viewMode === "original-only") setDuration(originalDuration);
    else setDuration(splicedTotal);
  }, [viewMode, aiClipDuration, originalDuration, splicedTotal]);

  /* ─── Phase management for spliced playback ─── */
  useEffect(() => {
    if (!hasSplice || viewMode !== "spliced") return;

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
  }, [phase, insertAtTimestamp, hasSplice, viewMode]);

  // When phase switches to ai-clip → play the AI video & pre-position original for smooth return
  useEffect(() => {
    if (phase === "ai-clip" && aiVideoRef.current) {
      aiVideoRef.current.currentTime = 0;
      aiVideoRef.current.play().catch(() => undefined);
      setShowOverlay(true);

      // Pre-position original video so the crossfade back shows the correct frame
      if (originalVideoRef.current) {
        originalVideoRef.current.currentTime = insertAtTimestamp;
      }
    }
  }, [phase, insertAtTimestamp]);

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
    if (hasSplice && phase === "ai-clip") return;
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

  const togglePlay = () => (isPlaying ? handlePause() : handlePlay());

  /* ─── Seek handler ─── */
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (viewMode === "original-only") {
      const target = pct * originalDuration;
      if (originalVideoRef.current) originalVideoRef.current.currentTime = target;
      setCurrentTime(target);
      return;
    }

    if (viewMode === "ai-only") {
      const target = pct * aiClipDuration;
      if (aiVideoRef.current) aiVideoRef.current.currentTime = target;
      setCurrentTime(target);
      return;
    }

    // Spliced mode — map click position to the right phase + video
    const target = pct * splicedTotal;

    if (target < insertAtTimestamp) {
      // Seeking into "original-before"
      originalVideoRef.current?.pause();
      aiVideoRef.current?.pause();
      setPhase("original-before");
      setShowOverlay(false);
      if (originalVideoRef.current) {
        originalVideoRef.current.currentTime = target;
        if (isPlaying) originalVideoRef.current.play().catch(() => undefined);
      }
      setCurrentTime(target);
    } else if (target < insertAtTimestamp + aiClipDuration) {
      // Seeking into "ai-clip"
      originalVideoRef.current?.pause();
      setPhase("ai-clip");
      setShowOverlay(true);
      const aiTime = target - insertAtTimestamp;
      if (aiVideoRef.current) {
        aiVideoRef.current.currentTime = aiTime;
        if (isPlaying) aiVideoRef.current.play().catch(() => undefined);
      }
      setCurrentTime(aiTime);
    } else {
      // Seeking into "original-after"
      aiVideoRef.current?.pause();
      setPhase("original-after");
      setShowOverlay(false);
      const origTime = insertAtTimestamp + (target - insertAtTimestamp - aiClipDuration);
      if (originalVideoRef.current) {
        originalVideoRef.current.currentTime = origTime;
        if (isPlaying) originalVideoRef.current.play().catch(() => undefined);
      }
      setCurrentTime(origTime);
    }
  };

  /* ─── Which video is visible ─── */
  const showOriginal =
    viewMode === "original-only" ||
    (viewMode === "spliced" && phase !== "ai-clip");
  const showAiClip =
    viewMode === "ai-only" ||
    (viewMode === "spliced" && phase === "ai-clip");

  /* ─── Switch view mode ─── */
  const switchMode = (mode: ViewMode) => {
    originalVideoRef.current?.pause();
    aiVideoRef.current?.pause();
    setIsPlaying(false);
    setShowOverlay(false);
    setHasTriggeredOverlay(false);
    setPhase("original-before");
    setViewMode(mode);
    setCurrentTime(0);

    if (originalVideoRef.current) originalVideoRef.current.currentTime = 0;
    if (aiVideoRef.current) aiVideoRef.current.currentTime = 0;
  };

  /* ─── Timeline position for seekbar ─── */
  const timelinePos = viewMode === "spliced" ? getSplicedPosition() : currentTime;
  const timelineDur = duration || 1;
  const progressPct = Math.min(100, (timelinePos / timelineDur) * 100);

  /* ─── AI clip region markers for spliced seekbar ─── */
  const aiRegionStart = hasSplice && viewMode === "spliced"
    ? (insertAtTimestamp / splicedTotal) * 100
    : 0;
  const aiRegionWidth = hasSplice && viewMode === "spliced"
    ? (aiClipDuration / splicedTotal) * 100
    : 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      {/* View mode selector */}
      {hasSplice && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">View:</span>
          <button
            type="button"
            onClick={() => switchMode("spliced")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "spliced"
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Spliced (Original + AI)
          </button>
          <button
            type="button"
            onClick={() => switchMode("original-only")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "original-only"
                ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Original Only
          </button>
          <button
            type="button"
            onClick={() => switchMode("ai-only")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "ai-only"
                ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            AI Clip Only
          </button>
        </div>
      )}

      {/* Phase indicator — only visible in spliced mode */}
      {hasSplice && viewMode === "spliced" && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "original-before"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            Original
          </span>
          <span className="text-zinc-700">&rarr;</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "ai-clip"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            AI Ad
          </span>
          <span className="text-zinc-700">&rarr;</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              phase === "original-after"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            Original
          </span>
        </div>
      )}

      {/* ─── Video area ─── */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800">
        {/* Original video — always rendered for sizing, opacity controls visibility */}
        <video
          ref={originalVideoRef}
          src={originalVideoUrl}
          className={`h-auto w-full bg-black transition-opacity duration-700 ease-in-out ${
            showOriginal ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* AI clip video — absolute overlay with crossfade */}
        {aiClipUrl && (
          <video
            ref={aiVideoRef}
            src={aiClipUrl}
            className={`absolute inset-0 h-full w-full object-contain bg-black transition-opacity duration-700 ease-in-out ${
              showAiClip ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            playsInline
            onEnded={viewMode === "spliced" ? handleAiClipEnded : undefined}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Scrim when overlay is showing */}
        {showOverlay && (
          <div className="pointer-events-none absolute inset-0 bg-black/20 transition-opacity duration-300" />
        )}

        {/* Shoppable bubble */}
        {viewMode !== "original-only" && (
          <ShoppableBubble
            visible={showOverlay}
            productName={adSlot.productName}
            imageUrl={adSlot.productImageUrl}
            buyUrl={adSlot.buyUrl}
            onClose={handleCloseOverlay}
            position={adSlot.placement}
          />
        )}

        {/* Click-to-play overlay when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <svg className="h-8 w-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* ─── Custom control bar ─── */}
      <div className="mt-3 space-y-2">
        {/* Seekbar */}
        <div
          className="group relative h-2 w-full cursor-pointer rounded-full bg-zinc-800"
          onClick={handleSeek}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
        >
          {/* AI clip region highlight (spliced mode) */}
          {hasSplice && viewMode === "spliced" && (
            <div
              className="absolute top-0 h-full rounded-full bg-emerald-900/40"
              style={{ left: `${aiRegionStart}%`, width: `${aiRegionWidth}%` }}
            />
          )}

          {/* Progress fill */}
          <div
            className="absolute top-0 h-full rounded-full bg-blue-500 transition-[width] duration-150"
            style={{ width: `${progressPct}%` }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 transition"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Replay */}
          <button
            type="button"
            onClick={handleReplay}
            className="flex h-8 items-center gap-1 rounded-lg border border-zinc-700 px-2.5 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 transition"
            title="Replay from start"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.36-5.36M20 15a9 9 0 01-15.36 5.36" />
            </svg>
          </button>

          {/* Time display */}
          <span className="font-mono text-zinc-300 tabular-nums">
            {fmt(timelinePos)} <span className="text-zinc-600">/</span> {fmt(timelineDur)}
          </span>

          {/* Phase label (spliced mode) */}
          {hasSplice && viewMode === "spliced" && (
            <span className="ml-auto">
              {phase === "original-before" && `Original → AI ad at ${insertAtTimestamp.toFixed(1)}s`}
              {phase === "ai-clip" && "Playing AI placement clip"}
              {phase === "original-after" && "Original (after ad)"}
            </span>
          )}

          {/* Mode label (non-spliced) */}
          {hasSplice && viewMode !== "spliced" && (
            <span className="ml-auto text-zinc-500">
              {viewMode === "original-only" ? "Original video" : "AI-generated clip"}
            </span>
          )}

          {/* Non-splice mode label */}
          {!hasSplice && (
            <span className="ml-auto text-zinc-500">
              Ad triggers at {adSlot.timestamp.toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
