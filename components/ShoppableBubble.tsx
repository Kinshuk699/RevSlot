"use client";

import { motion, AnimatePresence } from "framer-motion";

type ShoppableBubbleProps = {
  visible: boolean;
  productName: string;
  imageUrl: string;
  buyUrl: string;
  onClose: () => void;
  /** Position within the video frame (0-1 range, default center-right) */
  position?: { x: number; y: number };
};

export function ShoppableBubble({
  visible,
  productName,
  imageUrl,
  buyUrl,
  onClose,
  position = { x: 0.55, y: 0.35 },
}: ShoppableBubbleProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <>
          {/* ---- Product placed IN the video frame ---- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute z-20"
            style={{
              left: `${position.x * 100}%`,
              top: `${position.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Product image with realistic compositing effects */}
            <div className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={productName}
                className="h-28 w-28 rounded-xl object-cover sm:h-36 sm:w-36"
                style={{
                  filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
                }}
              />
              {/* Pulsing ring to draw attention */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-xl border-2 border-emerald-400"
              />
            </div>
          </motion.div>

          {/* ---- Shop tag / mini card (bottom of video) ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-full border border-zinc-600/60 bg-black/80 py-2 pl-3 pr-2 shadow-2xl backdrop-blur-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={productName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-emerald-400/50"
              />
              <span className="max-w-[140px] truncate text-sm font-medium text-zinc-100">
                {productName}
              </span>
              <a
                href={buyUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 transition-colors"
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
        </>
      ) : null}
    </AnimatePresence>
  );
}
