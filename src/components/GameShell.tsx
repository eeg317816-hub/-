"use client";

import { ReactNode, useEffect, useState } from "react";
import { HudCornerMarks } from "@/components/HudDecor";
import { getPublicAppEnv } from "@/lib/public-env";

type Props = {
  children: ReactNode;
  scene?: "arena" | "stage" | "hud";
  className?: string;
  showHudChrome?: boolean;
};

export function GameShell({
  children,
  scene = "hud",
  className = "",
  showHudChrome = true,
}: Props) {
  const [clock, setClock] = useState("");
  const env = getPublicAppEnv();

  useEffect(() => {
    const tick = () => {
      setClock(
        new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const bg =
    scene === "hud"
      ? `
          radial-gradient(ellipse at center, rgba(80,8,14,0.35), rgba(5,5,8,0.92) 60%),
          linear-gradient(180deg, #050508 0%, #0a0608 100%),
          url(/scenes/arena.jpg)
        `
      : `
          linear-gradient(180deg, rgba(5,5,8,0.78), rgba(8,4,8,0.9)),
          url(/scenes/${scene}.jpg)
        `;

  return (
    <main
      className={`relative min-h-screen overflow-hidden text-white ${className}`}
      style={{
        backgroundImage: bg,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* network map vibe */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:radial-gradient(circle_at_20%_30%,rgba(227,28,35,0.35),transparent_28%),radial-gradient(circle_at_75%_55%,rgba(227,28,35,0.25),transparent_32%),radial-gradient(circle_at_45%_80%,rgba(227,28,35,0.18),transparent_25%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(227,28,35,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(227,28,35,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="scanlines pointer-events-none absolute inset-0" />
      <div className="hud-scan-line" />
      {showHudChrome && <HudCornerMarks />}
      {showHudChrome && (
        <div className="pointer-events-none absolute bottom-8 left-8 font-tech text-xs tracking-wider text-[#e31c23]/80">
          {clock || "--:--:--"}
          <span className="ml-3 text-[#666]">{env.toUpperCase()}</span>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </main>
  );
}
