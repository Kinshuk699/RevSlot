"use client";

const STEPS = [
  { src: "/howitworks/before.jpg", step: "01", label: "Upload Video" },
  { src: "/howitworks/nike2.png", step: "02", label: "Add Product" },
  { src: "/howitworks/after.jpg", step: "03", label: "AI Result" },
];

function Arrow() {
  return (
    <div className="flex items-center justify-center px-2 sm:px-4 shrink-0">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#36A64F]">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="py-16">
      <h2 className="mb-10 text-center font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-black/90 sm:text-3xl">
        How It Works
      </h2>

      <div className="flex items-center justify-center gap-3 sm:gap-5 px-4">
        {STEPS.map((item, i) => (
          <div key={item.step} className="flex items-center gap-3 sm:gap-5">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="font-['Space_Mono'] text-[10px] font-bold uppercase tracking-[0.2em] text-[#36A64F]">
                {item.step}
              </span>
              <div className="rounded-2xl overflow-hidden border border-black/6 shadow-[0_4px_30px_rgba(0,0,0,0.06)]">
                <img
                  src={item.src}
                  alt={item.label}
                  className="w-40 h-40 sm:w-56 sm:h-56 object-cover"
                />
              </div>
              <span className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.15em] text-black/40">
                {item.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
    </section>
  );
}
