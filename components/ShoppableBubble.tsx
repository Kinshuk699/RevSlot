"use client";

import { motion, AnimatePresence } from "framer-motion";

type ShoppableBubbleProps = {
  visible: boolean;
  productName: string;
  imageUrl: string;
  buyUrl: string;
  onClose: () => void;
};

export function ShoppableBubble({
  visible,
  productName,
  imageUrl,
  buyUrl,
  onClose,
}: ShoppableBubbleProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute bottom-5 right-5 z-20 w-72 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <img src={imageUrl} alt={productName} className="h-16 w-16 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-100">{productName}</p>
              <p className="mt-1 text-xs text-zinc-400">Product detected in scene</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <a
              href={buyUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-md bg-zinc-100 px-3 py-2 text-center text-sm font-semibold text-zinc-900 hover:bg-white"
            >
              Buy Now
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500"
            >
              Close
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
