"use client";

import { useEffect, useState } from "react";

const INPUT_TEXT = "headphones  ·  burger  ·  cold drink  ·  energy drink  ·  sneakers  ·  sunglasses  ·  laptop  ·  coffee  ·  watch  ·  earbuds  ·  soda  ·  backpack  ·  ";
const OUTPUT_TEXT = "Beats  ✦  McDonald's  ✦  Coca-Cola  ✦  Red Bull  ✦  Nike  ✦  Ray-Ban  ✦  MacBook  ✦  Starbucks  ✦  Rolex  ✦  AirPods  ✦  Pepsi  ✦  JanSport  ✦  ";

export function HeroAnimation() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="relative w-full flex items-center justify-center" style={{ height: 80 }}><div className="h-12 w-40 rounded-2xl bg-black/5" /></div>;
  }

  return (
    <div className="relative w-full flex items-center justify-center" style={{ height: 80 }}>
      {/* ─── Input ribbon (no background, just flowing text) ─── */}
      <div className="absolute right-1/2 mr-20 top-1/2 -translate-y-1/2 overflow-hidden" style={{ width: "50vw", height: 30 }}>
        <div className="flex items-center h-full whitespace-nowrap animate-ribbon-right" style={{ animationDuration: "25s" }}>
          <span className="font-['Space_Mono'] text-[11px] uppercase tracking-[0.08em] text-black/25">
            {INPUT_TEXT.repeat(8)}
          </span>
        </div>
      </div>

      {/* ─── Output ribbon (black background) ─── */}
      <div className="absolute left-1/2 ml-20 top-1/2 -translate-y-1/2 overflow-hidden rounded-r-full" style={{ width: "50vw", height: 30, background: "black" }}>
        <div className="flex items-center h-full whitespace-nowrap animate-ribbon-right" style={{ animationDuration: "20s" }}>
          <span className="font-['Space_Mono'] text-[11px] uppercase tracking-[0.1em] text-[#fffeec]/70">
            {OUTPUT_TEXT.repeat(10)}
          </span>
        </div>
      </div>

      {/* ─── Central RevSlot box ─── */}
      <div className="relative z-10 flex items-center gap-2.5 rounded-2xl border border-[#36A64F]/25 bg-[#fffeec] px-5 py-3 shadow-[0_2px_30px_rgba(0,0,0,0.06)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#36A64F]/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#36A64F]">
            <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-black/85">RevSlot</span>
          <span className="font-['Space_Mono'] text-[7px] uppercase tracking-[0.2em] text-[#36A64F]/70">AI Director</span>
        </div>
      </div>
    </div>
  );
}
