"use client";

export function HudCornerMarks() {
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 font-tech text-[10px] tracking-[0.25em] text-[#e31c23]/80">
        RONGYAO ID
      </div>
      <div className="pointer-events-none absolute right-3 top-3 font-tech text-[10px] tracking-[0.25em] text-[#e31c23]/80">
        GLORY SYSTEM
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 font-tech text-[10px] text-[#e31c23]/70">
        G10
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 h-1.5 w-16 bg-gradient-to-r from-[#e31c23] to-transparent opacity-70" />
      {/* corner brackets */}
      <span className="pointer-events-none absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2 border-[#e31c23]/80" />
      <span className="pointer-events-none absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2 border-[#e31c23]/80" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-[#e31c23]/80" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-[#e31c23]/80" />
    </>
  );
}

export function HudClock() {
  // static placeholder refreshed by parent if needed — keep simple CSS-free mount time
  return (
    <div className="pointer-events-none absolute bottom-8 left-8 font-tech text-xs text-[#e31c23]/75">
      {/* filled by LiveClock if used */}
    </div>
  );
}
