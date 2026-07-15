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

/** 先立刻铺纯黑+网格，再异步换高清底图，避免大图渐进绘制卡顿 */
function useHudBackground(enabled: boolean) {
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tryLoad = (url: string) =>
      new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error(url));
        img.src = url;
      });

    (async () => {
      for (const url of ["/hud-bg.webp", "/hud-bg.jpg", "/hud-bg.png"]) {
        try {
          const ok = await tryLoad(url);
          if (!cancelled) setBgUrl(ok);
          return;
        } catch {
          // try next fallback
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return bgUrl;
}

export function GameShell({
  children,
  scene = "hud",
  className = "",
  showHudChrome = true,
}: Props) {
  const [clock, setClock] = useState("");
  const env = getPublicAppEnv();
  const hudBg = useHudBackground(scene === "hud");

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

  const bgImage =
    scene === "hud"
      ? hudBg
        ? `url(${hudBg})`
        : undefined
      : `
          linear-gradient(180deg, rgba(5,5,8,0.72), rgba(8,4,8,0.88)),
          url(/scenes/${scene}.jpg)
        `;

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-black text-white ${className}`}
      style={{
        backgroundColor: "#000",
        backgroundImage: bgImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        transition: hudBg ? "background-image 0.35s ease" : undefined,
      }}
    >
      {/* 首屏立即可见的网格氛围（不等大图） */}
      {scene === "hud" && !hudBg && (
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_30%,rgba(227,28,35,0.28),transparent_28%),radial-gradient(circle_at_75%_55%,rgba(227,28,35,0.2),transparent_32%),linear-gradient(rgba(227,28,35,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(227,28,35,0.05)_1px,transparent_1px)] [background-size:auto,auto,48px_48px,48px_48px]" />
      )}
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
