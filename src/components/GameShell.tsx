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

  // hud：使用干净 HUD 底图；其它场景保留原图并加压暗
  const bgImage =
    scene === "hud"
      ? "url(/hud-bg.png), url(/scenes/hud-bg.png)"
      : `
          linear-gradient(180deg, rgba(5,5,8,0.72), rgba(8,4,8,0.88)),
          url(/scenes/${scene}.jpg)
        `;

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-black text-white ${className}`}
      style={{
        backgroundImage: bgImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#000",
      }}
    >
      {/* 轻微暗角，避免抢过底图细节 */}
      {scene === "hud" && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.45)_100%)]" />
      )}
      <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />
      <div className="hud-scan-line opacity-40" />
      {showHudChrome && <HudCornerMarks />}
      {showHudChrome && (
        <div className="pointer-events-none absolute bottom-6 left-6 z-[5] font-tech text-[11px] tracking-[0.2em] text-[#e31c23]/85">
          {clock || "--:--:--"}
          <span className="ml-3 text-[#666]">{env.toUpperCase()}</span>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </main>
  );
}
