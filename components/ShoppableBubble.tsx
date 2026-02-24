"use client";

import { motion, AnimatePresence } from "framer-motion";

type ShoppableBubbleProps = {
  visible: boolean;
  productName: string;
  imageUrl: string;
  buyUrl: string;
  onClose: () => void;
  /** Position within the video frame (0-1 range) — unused now, kept for API compat */
  position?: { x: number; y: number };
};

/**
 * A subtle shoppable CTA bar that appears at the bottom of the video.
 * The actual product placement is INPAINTED into the video itself —
 * this is just the interactive "Shop" overlay so viewers can buy.
 */
export function ShoppableBubble({
  visible,
  productName,
  buyUrl,
  onClose,
}: ShoppableBubbleProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-full border border-zinc-600/60 bg-black/80 py-2 pl-4 pr-2 shadow-2xl backdrop-blur-md">
            {/* Small emerald dot indicator */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#36A64F] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#36A64F]" />
            </span>

            <span className="max-w-[200px] truncate text-sm font-medium text-zinc-100">
              {productName}
            </span>

            <a
              href={buyUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#36A64F] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#36A64F]/80 transition-colors"
            >
              Shop
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
