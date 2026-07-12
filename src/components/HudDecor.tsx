"use client";

/** 参考图周边 HUD 标签与角标（底图已有装饰，这里补可读系统字） */
export function HudCornerMarks() {
  return (
    <>
      <div className="pointer-events-none absolute left-5 top-4 z-[5] font-tech text-[10px] tracking-[0.28em] text-[#e31c23]/90">
        RONGYAO ID
      </div>
      <div className="pointer-events-none absolute right-5 top-4 z-[5] font-tech text-[10px] tracking-[0.28em] text-[#e31c23]/90">
        GLORY SYSTEM
      </div>
      <div className="pointer-events-none absolute bottom-6 right-6 z-[5] flex items-center gap-2">
        <span className="font-tech text-[10px] tracking-widest text-[#e31c23]/80">G10</span>
        <span className="h-1.5 w-14 bg-gradient-to-r from-[#e31c23] to-transparent opacity-80" />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 z-[5] h-8 w-8 border-l-2 border-t-2 border-[#e31c23]/85" />
      <span className="pointer-events-none absolute right-3 top-3 z-[5] h-8 w-8 border-r-2 border-t-2 border-[#e31c23]/85" />
      <span className="pointer-events-none absolute bottom-3 left-3 z-[5] h-8 w-8 border-b-2 border-l-2 border-[#e31c23]/85" />
      <span className="pointer-events-none absolute bottom-3 right-3 z-[5] h-8 w-8 border-b-2 border-r-2 border-[#e31c23]/85" />

      {/* 侧边刻度感 */}
      <div className="pointer-events-none absolute left-2 top-1/2 z-[5] hidden h-40 w-px -translate-y-1/2 bg-[#e31c23]/35 md:block" />
      <div className="pointer-events-none absolute right-2 top-1/2 z-[5] hidden h-40 w-px -translate-y-1/2 bg-[#e31c23]/35 md:block" />
    </>
  );
}
