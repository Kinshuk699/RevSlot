"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppableBubble } from "@/components/ShoppableBubble";

export type AdSlot = {
  timestamp: number;
  productName: string;
  productImageUrl: string;
  buyUrl: string;
};

type VibePlayerProps = {
  videoUrl: string;
  adSlot: AdSlot;
};

export function VibePlayer({ videoUrl, adSlot }: VibePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const video = videoRef.current;

      if (!video || hasTriggered) {
        return;
      }

      const currentTime = video.currentTime;
      const isHit = Math.abs(currentTime - adSlot.timestamp) <= 0.5;

      if (isHit) {
        video.pause();
        setShowOverlay(true);
        setHasTriggered(true);
      }
    }, 500);

    return () => {
      window.clearInterval(timer);
    };
  }, [adSlot.timestamp, hasTriggered]);

  const handleClose = () => {
    setShowOverlay(false);
    videoRef.current?.play().catch(() => undefined);
  };

  const handleReplay = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setShowOverlay(false);
    setHasTriggered(false);
    video.currentTime = 0;
    video.play().catch(() => undefined);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="relative overflow-hidden rounded-xl border border-zinc-800">
        <video ref={videoRef} src={videoUrl} controls className="h-auto w-full bg-black" playsInline />
        <ShoppableBubble
          visible={showOverlay}
          productName={adSlot.productName}
          imageUrl={adSlot.productImageUrl}
          buyUrl={adSlot.buyUrl}
          onClose={handleClose}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span>Ad slot timestamp: {adSlot.timestamp.toFixed(1)}s</span>
        <button
          type="button"
          onClick={handleReplay}
          className="rounded-md border border-zinc-700 px-2.5 py-1 font-medium text-zinc-200 hover:border-zinc-500"
        >
          Replay Demo
        </button>
      </div>
    </div>
  );
}
