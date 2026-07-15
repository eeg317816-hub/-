"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDeviceCode } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { CardInsertSlot } from "@/components/CardInsertSlot";
import { playSfx } from "@/lib/sfx";
import { useCardScanner } from "@/hooks/useCardScanner";
import { enableCardTapSim, apiUrl } from "@/lib/public-env";
import { setTerminalSessionId, setTerminalState } from "@/lib/terminal-state";

const TRANSITION_SECONDS = 2.4;

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [playingTransition, setPlayingTransition] = useState(false);
  const [scannerOn, setScannerOn] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enteringRef = useRef(false);
  const showCardTap = enableCardTapSim();

  useEffect(() => {
    getDeviceCode();
    setTerminalState("WAITING_CARD");
    return () => {
      // 离开刷卡页时关闭监听标志，避免泄漏到登录页
      setScannerOn(false);
    };
  }, []);

  const enterLogin = useCallback(async () => {
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
      const raw = err instanceof Error ? err.message : "进入失败";
      const msg =
        raw === "Failed to fetch" || raw === "NetworkError when attempting to fetch resource."
          ? "网络繁忙，请稍后再刷卡"
          : raw;
      setStatus(msg);
      setLoading(false);
      enteringRef.current = false;
      setScannerOn(true);
    }
  }, [loading, playingTransition]);

  // 读卡器仅本页启用；登录/游戏等页不挂载此 Hook 的 enabled=true
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
      setTimeout(() => router.push("/login"), 600);
    });
  }, [playingTransition, router]);

  function finishTransition() {
    router.push("/login");
  }

  function onVideoTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= TRANSITION_SECONDS) {
      v.pause();
      finishTransition();
    }
  }

  return (
    <GameShell scene="hud">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-5 py-8">
        <motion.h1
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="title-glow mb-8 text-center"
        >
          <span className="hud-frame-title inline-block px-8 py-2.5 font-display text-3xl tracking-[0.22em] text-[#ff2a36] md:text-5xl">
            全职高手&nbsp;&nbsp;测手速
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="hud-frame-logo hud-pulse mb-8 w-full max-w-xl p-3 md:p-4"
        >
          <img
            src="/brand/logo-full.png"
            alt="全职高手"
            className="h-auto w-full object-contain drop-shadow-[0_0_36px_rgba(227,28,35,0.65)]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="flex w-full max-w-md flex-col items-center"
        >
          <div className="hud-frame w-full px-5 py-3.5 text-center">
            <p className="text-lg tracking-wide text-[#f5f5f5] md:text-xl">
              请刷卡登录后开始比赛
            </p>
          </div>

          {status && (
            <p className="mt-3 text-center text-sm text-[#ff8877]">{status}</p>
          )}

          {showCardTap ? (
            <CardInsertSlot
              disabled={loading || playingTransition}
              onInsert={() => void enterLogin()}
            />
          ) : (
            <p className="mt-6 text-center font-tech text-xs tracking-[0.35em] text-[#e31c23]/85">
              WAITING FOR CARD SCAN
            </p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <Link
            href="/leaderboard"
            prefetch={false}
            className="hud-link mt-12 inline-block text-sm tracking-[0.15em]"
          >
            &gt;&gt;&nbsp;查看排行榜&nbsp;&lt;&lt;
          </Link>
        </motion.div>
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
              muted
              onTimeUpdate={onVideoTimeUpdate}
              onEnded={finishTransition}
              onError={finishTransition}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
