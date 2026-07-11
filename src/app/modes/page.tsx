"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSession } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { playSfx } from "@/lib/sfx";

export default function ModesPage() {
  const router = useRouter();
  const [quota, setQuota] = useState<{
    todayPlayCount: number;
    dailyPlayLimit: number;
    practiceOnly?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const s = getSession();
    if (!s.playerId || !s.cardId) {
      router.replace("/");
      return;
    }
    setNickname(s.nickname);
    const raw = sessionStorage.getItem("qzgs_quota");
    if (raw) setQuota(JSON.parse(raw));
  }, [router]);

  async function start() {
    setLoading(true);
    setMsg("");
    try {
      const s = getSession();
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: s.playerId,
          cardId: s.cardId,
          deviceCode: s.deviceCode,
          mode: "apm_challenge",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "开局失败");
      sessionStorage.setItem("qzgs_play", JSON.stringify(json));
      if (json.message) setMsg(json.message);
      playSfx("whoosh", 0.4);
      router.push("/game");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "开局失败");
      setLoading(false);
    }
  }

  const remain =
    quota != null
      ? Math.max(0, quota.dailyPlayLimit - quota.todayPlayCount)
      : null;

  return (
    <GameShell scene="arena">
      <div className="mx-auto min-h-screen max-w-xl px-6 py-10">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display title-glow mb-2 text-4xl tracking-wider text-[#ffe9a8]"
        >
          准备挑战
        </motion.h1>
        <p className="mb-6 text-[#c8c8c8]">
          选手：{nickname || "-"}
          {quota && (
            <>
              {" "}
              · 今日已玩 {quota.todayPlayCount}/{quota.dailyPlayLimit}
              {remain === 0 && (
                <span className="text-[#ffaa66]"> · 超次后可练习不进榜</span>
              )}
            </>
          )}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-glow rounded-2xl p-6"
        >
          <div className="font-display text-2xl text-[#ffd56a]">职业 APM 测试</div>
          <p className="mt-3 text-sm leading-relaxed text-[#bbb]">
            键鼠混合挑战。正确操作加分，失误扣分断连。综合分进入今日榜 / 总榜。
          </p>
          {remain != null && (
            <p className="mt-4 font-tech text-sm text-[#7CFFB2]">
              REMAINING · {remain} RUNS
            </p>
          )}
        </motion.div>

        {msg && <p className="mt-4 text-[#ffaa66]">{msg}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={start}
          className="btn-game mt-8 w-full rounded-lg py-3 text-lg font-semibold"
        >
          {loading ? "准备中…" : "开始挑战"}
        </button>
      </div>
    </GameShell>
  );
}
