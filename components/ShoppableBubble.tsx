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
  imageUrl,
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
          <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/15 py-1.5 pl-1.5 pr-1.5 shadow-2xl backdrop-blur-xl">
            {/* Product thumbnail */}
            <img
              src={imageUrl}
              alt="Product"
              className="h-8 w-8 rounded-full object-cover border border-white/20"
            />

            <a
              href={buyUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#36A64F] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#36A64F]/80 transition-colors"
            >
              Shop
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
