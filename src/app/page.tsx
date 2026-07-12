"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getDeviceCode } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { playSfx } from "@/lib/sfx";
import { useCardScanner } from "@/hooks/useCardScanner";
import { enableDevCardInput, apiUrl } from "@/lib/public-env";
import {
  setTerminalSessionId,
  setTerminalState,
} from "@/lib/terminal-state";

const DEV_PLACEHOLDER = "DEV-CARD-001";

export default function HomePage() {
  const router = useRouter();
  const [cardCode, setCardCode] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [playingTransition, setPlayingTransition] = useState(false);
  const [scannerOn, setScannerOn] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enteringRef = useRef(false);
  const showDevInput = enableDevCardInput();

  useEffect(() => {
    getDeviceCode();
    setTerminalState("WAITING_CARD");
  }, []);

  const enterLogin = useCallback(async (_ignoredScanPayload?: string) => {
    // 故意不使用、不上传、不存储刷卡字符串
    if (enteringRef.current || loading || playingTransition) return;
    enteringRef.current = true;
    setScannerOn(false);
    setLoading(true);
    setStatus("正在进入…");

    try {
      const deviceCode = getDeviceCode();
      const res = await fetch(apiUrl("/api/terminal/open"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "无法开启终端");

      setTerminalSessionId(json.terminalSessionId);
      setTerminalState("LOGIN");
      playSfx("whoosh", 0.55);
      setPlayingTransition(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "进入失败");
      setLoading(false);
      enteringRef.current = false;
      setScannerOn(true);
    }
  }, [loading, playingTransition]);

  useCardScanner({
    enabled: scannerOn && !playingTransition,
    onScan: () => {
      void enterLogin();
    },
  });

  useEffect(() => {
    if (!playingTransition) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play().catch(() => {
      setTimeout(() => router.push("/login"), 800);
    });
  }, [playingTransition, router]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void enterLogin();
  }

  return (
    <GameShell scene="hud">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-10">
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display title-glow hud-pulse mb-6 text-center text-4xl tracking-[0.18em] text-[#ff3b45] md:text-6xl"
        >
          <span className="hud-frame inline-block px-6 py-2">全职高手&nbsp;&nbsp;测手速</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hud-pulse mb-7 w-full max-w-lg overflow-hidden"
        >
          <Image
            src="/brand/logo-full.png"
            alt="全职高手"
            width={785}
            height={552}
            priority
            className="h-auto w-full object-contain drop-shadow-[0_0_28px_rgba(227,28,35,0.55)]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="hud-frame px-6 py-4 text-center">
            <p className="font-display text-xl tracking-wide text-white md:text-2xl">
              请刷卡登录后开始比赛
            </p>
          </div>

          {status && (
            <p className="mt-3 text-center text-sm text-[#ff8877]">{status}</p>
          )}

          {showDevInput && (
            <form onSubmit={onSubmit} className="mt-5 flex gap-2">
              <input
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                placeholder={`开发调试输入 ${DEV_PLACEHOLDER}`}
                className="hud-input flex-1 text-sm"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || playingTransition}
                className="btn-game rounded-md px-5 py-3 text-sm font-semibold"
              >
                {loading || playingTransition ? "进入中" : "进入"}
              </button>
            </form>
          )}

          {!showDevInput && (
            <p className="mt-5 text-center font-tech text-xs tracking-widest text-[#e31c23]/80">
              WAITING FOR CARD SCAN
            </p>
          )}
        </motion.div>

        <Link href="/leaderboard" className="hud-link mt-10 text-sm">
          &gt;&gt;&nbsp;查看排行榜&nbsp;&lt;&lt;
        </Link>
      </div>

      <AnimatePresence>
        {playingTransition && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <video
              ref={videoRef}
              src="/media/card-transition.mp4"
              className="h-full w-full object-cover"
              playsInline
              autoPlay
              muted={false}
              onEnded={() => router.push("/login")}
              onError={() => router.push("/login")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
