"use client";

const CARDS = [
  {
    title: "Content Creators",
    ribbon: "Monetize your existing videos by inserting brand-native product placements — no reshoots, no manual editing.",
    position: "30%",       // 30% from left
    ribbonBg: "#36A64F",   // green
    ribbonText: "#fffeec",
  },
  {
    title: "E-Commerce Brands",
    ribbon: "See your product in lifestyle scenes instantly. Generate shoppable video ads with a single click.",
    position: "50%",       // center
    ribbonBg: "#000000",   // black
    ribbonText: "#fffeec",
  },
  {
    title: "Ad Agencies",
    ribbon: "Pitch product placement concepts in hours, not weeks. A/B test placements across different scenes and products.",
    position: "70%",       // 70% from left (30% right)
    ribbonBg: "#FF6363",   // coral
    ribbonText: "#fffeec",
  },
];

function RibbonRow({
  title,
  ribbon,
  speed,
  position,
  ribbonBg,
  ribbonText,
}: {
  title: string;
  ribbon: string;
  speed: number;
  position: string;
  ribbonBg: string;
  ribbonText: string;
}) {
  const repeated = (ribbon + "  ✦  ").repeat(12);

  return (
    <div className="relative flex items-center w-full" style={{ height: 30 }}>
      {/* Left side: transparent background, flowing text */}
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ right: `calc(100% - ${position})` }}>
        <div
          className="flex items-center h-full whitespace-nowrap animate-ribbon-right"
          style={{ animationDuration: `${speed}s` }}
        >
          <span className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.08em] text-black/20">
            {repeated}
          </span>
        </div>
      </div>

      {/* Right side: colored background, flowing text */}
      <div
        className="absolute inset-y-0 right-0 overflow-hidden rounded-r-full"
        style={{ left: position, backgroundColor: ribbonBg }}
      >
        <div
          className="flex items-center h-full whitespace-nowrap animate-ribbon-right"
          style={{ animationDuration: `${speed}s` }}
        >
          <span
            className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.08em]"
            style={{ color: `${ribbonText}99` }}
          >
            {repeated}
          </span>
        </div>
      </div>

      {/* Center box */}
      <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: position }}>
        <div className="flex items-center gap-2 rounded-2xl border border-[#36A64F]/25 bg-[#fffeec] px-5 py-2.5 shadow-[0_2px_30px_rgba(0,0,0,0.06)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#36A64F]/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#36A64F]">
              <path
                d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="font-['Space_Grotesk'] text-sm font-bold tracking-tight text-black/85 whitespace-nowrap">
            {title}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CreatorRibbons() {
  return (
    <section className="py-16 overflow-hidden">
      <h2 className="mb-3 text-center font-['Space_Grotesk'] text-2xl font-bold tracking-tight">
        Built for Every Creator
      </h2>
      <p className="mx-auto mb-10 max-w-lg text-center text-sm text-black/50">
        Whether you&apos;re a solo influencer or a brand agency, RevSlot automates
        product placement at a fraction of the cost.
      </p>

      <div className="flex flex-col gap-16">
        {CARDS.map((card, i) => (
          <RibbonRow
            key={card.title}
            title={card.title}
            ribbon={card.ribbon}
            speed={28 + i * 6}
            position={card.position}
            ribbonBg={card.ribbonBg}
            ribbonText={card.ribbonText}
          />
        ))}
      </div>
    </section>
  );
}
