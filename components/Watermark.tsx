"use client";

import { motion } from "framer-motion";

type WatermarkProps = {
  /** Show the watermark only for free-tier users */
  visible: boolean;
};

/**
 * Semi-transparent diagonal watermark overlay for free-plan videos.
 * Sits on top of the video player container.
 */
export function Watermark({ visible }: WatermarkProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
    >
      <div className="flex -rotate-12 flex-col items-center gap-3 select-none">
        <span className="text-5xl font-extrabold tracking-widest text-white/[0.12] sm:text-6xl">
          REVSLOT
        </span>
        <span className="text-sm font-medium tracking-[0.25em] text-white/[0.10]">
          FREE PLAN • UPGRADE TO REMOVE
        </span>
      </div>
    </motion.div>
  );
}
