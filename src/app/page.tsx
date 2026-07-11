"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getDeviceCode, saveSession } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { playSfx } from "@/lib/sfx";

const DEV_CARD = "DEV-CARD-001";

export default function HomePage() {
  const router = useRouter();
  const [cardCode, setCardCode] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [playingTransition, setPlayingTransition] = useState(false);
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  async function verifyCard(code: string) {
    const normalized = code.trim();
    if (!normalized || loading || playingTransition) return;
    setLoading(true);
    setStatus("正在验证参赛卡…");

    try {
      const deviceCode = getDeviceCode();
      const res = await fetch("/api/card/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardCode: normalized, deviceCode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "刷卡失败");

      saveSession({ cardId: json.cardId });
      setStatus("验证成功，正在进入…");
      playSfx("whoosh", 0.55);
      setPlayingTransition(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "刷卡失败");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!playingTransition) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play().catch(() => {
      // 若自动播放失败，短延迟后跳转
      setTimeout(() => router.push("/login"), 800);
    });
  }, [playingTransition, router]);

  useEffect(() => {
    getDeviceCode();
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (playingTransition) return;
      const now = Date.now();
      if (now - lastKeyAtRef.current > 120) bufferRef.current = "";
      lastKeyAtRef.current = now;

      if (e.key === "Enter") {
        const scanned = bufferRef.current.trim();
        bufferRef.current = "";
        if (scanned) {
          e.preventDefault();
          setCardCode(scanned);
          void verifyCard(scanned);
        }
        return;
      }
      if (e.key.length === 1) bufferRef.current += e.key;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, playingTransition]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void verifyCard(cardCode || DEV_CARD);
  }

  return (
    <GameShell scene="arena">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-10">
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display title-glow mb-6 text-center text-4xl tracking-[0.18em] text-[#ffe9a8] md:text-6xl"
        >
          全职高手&nbsp;&nbsp;测手速
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-7 w-full max-w-lg overflow-hidden rounded-2xl border border-[#ffd56a44] bg-black/30 shadow-[0_0_36px_rgba(201,162,39,0.25)]"
        >
          <Image
            src="/brand/logo-full.png"
            alt="全职高手"
            width={785}
            height={552}
            priority
            className="h-auto w-full object-contain"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-glow w-full max-w-md rounded-2xl px-8 py-7"
        >
          <div className="mx-auto mb-5 h-1.5 w-48 overflow-hidden rounded-full bg-[#2a1520]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#ff3344] to-[#ffd56a]"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              style={{ width: "45%" }}
            />
          </div>

          <p className="font-display text-center text-2xl tracking-wide text-white md:text-3xl">
            请刷卡登录后开始比赛
          </p>
          {status && (
            <p className="mt-2 text-center text-sm text-[#ffaa66]">{status}</p>
          )}

          <form onSubmit={onSubmit} className="mt-6 flex gap-2">
            <input
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              placeholder={`开发调试输入 ${DEV_CARD}`}
              className="flex-1 rounded-lg border border-[#ff334450] bg-black/40 px-3 py-3 text-sm outline-none focus:border-[#ffd56a]"
            />
            <button
              type="submit"
              disabled={loading || playingTransition}
              className="btn-game rounded-lg px-5 py-3 text-sm font-semibold"
            >
              {loading || playingTransition ? "进入中" : "进入"}
            </button>
          </form>
        </motion.div>

        <Link
          href="/leaderboard"
          className="mt-8 text-sm text-[#cfcfcf] underline underline-offset-4 hover:text-[#ffd56a]"
        >
          查看排行榜
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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.35))]" />
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
