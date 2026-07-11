"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSession } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { playSfx } from "@/lib/sfx";

type ResultView = {
  score: number;
  rankLevel: string;
  rankTitle: string;
  comment?: string;
  todayRank: number | null;
  bestScore: number;
  apm: number;
  accuracy: number;
  maxCombo: number;
  isValid: boolean;
  cheatFlag: boolean;
  cheatReason?: string | null;
};

export default function ResultPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"submitting" | "done" | "error">("submitting");
  const [result, setResult] = useState<ResultView | null>(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(10);
  const [remainRuns, setRemainRuns] = useState<number | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const payloadRaw = sessionStorage.getItem("qzgs_result_payload");
    if (!payloadRaw) {
      window.setTimeout(() => router.replace("/"), 0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const payload = JSON.parse(payloadRaw);
        const res = await fetch("/api/game/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "提交失败");
        if (cancelled) return;
        setResult(json);
        setPhase("done");
        playSfx("combo", 0.45);

        // refresh quota
        const s = getSession();
        const reg = await fetch("/api/player/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: s.cardId,
            phone: s.phone,
            nickname: s.nickname,
            deviceCode: s.deviceCode,
          }),
        }).then((r) => r.json()).catch(() => null);
        if (reg?.success) {
          const remain = Math.max(0, reg.dailyPlayLimit - reg.todayPlayCount);
          setRemainRuns(remain);
          sessionStorage.setItem(
            "qzgs_quota",
            JSON.stringify({
              todayPlayCount: reg.todayPlayCount,
              dailyPlayLimit: reg.dailyPlayLimit,
              practiceOnly: reg.practiceOnly,
            }),
          );
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "提交失败");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (phase !== "done") return;
    setCountdown(10);
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      setCountdown((c) => Math.max(c - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    if (countdown !== 0) return;
    if (pausedRef.current) return;
    window.setTimeout(() => {
      router.replace("/");
    }, 0);
  }, [phase, countdown, router]);

  async function continuePlay() {
    pausedRef.current = true;
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
    if (!json.success) {
      setError(json.error || "无法继续");
      pausedRef.current = false;
      return;
    }
    sessionStorage.setItem("qzgs_play", JSON.stringify(json));
    playSfx("whoosh", 0.4);
    router.push("/game");
  }

  function endPlay() {
    pausedRef.current = true;
    router.replace("/");
  }

  return (
    <GameShell scene="stage">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-10">
        {phase === "submitting" && (
          <div className="text-center text-[#aaa]">成绩校验提交中…</div>
        )}
        {phase === "error" && (
          <div className="panel-glow rounded-2xl p-8 text-center">
            <p className="mb-4 text-[#ff7777]">{error}</p>
            <button type="button" className="btn-game rounded-lg px-6 py-2" onClick={() => router.push("/modes")}>
              返回
            </button>
          </div>
        )}
        {phase === "done" && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="panel-glow rounded-2xl p-8 text-center"
          >
            <div className="text-[#aaa]">测试完成</div>
            <div className="font-display mt-3 text-3xl tracking-wide text-[#ffe9a8]">
              {result.rankLevel} · {result.rankTitle}
            </div>
            <div className="mt-4 text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,51,68,0.45)]">
              {result.score}
            </div>
            <div className="text-[#aaa]">综合得分</div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <Cell label="APM" value={result.apm} />
              <Cell label="正确率" value={`${result.accuracy}%`} />
              <Cell label="最大连击" value={result.maxCombo} />
              <Cell label="今日排名" value={result.todayRank ?? "-"} />
              <Cell label="历史最好" value={result.bestScore} />
              <Cell label="进榜" value={result.isValid ? "是" : "否"} />
            </div>
            {result.comment && <p className="mt-6 text-[#ffaa66]">{result.comment}</p>}
            {result.cheatFlag && (
              <p className="mt-2 text-sm text-[#ff7777]">异常标记：{result.cheatReason}</p>
            )}

            <div className="mt-6 rounded-xl border border-[#ffd56a55] bg-black/30 px-4 py-3">
              <div className="font-tech text-sm tracking-widest text-[#ffd56a]">
                AUTO EXIT · {countdown}s
              </div>
              <p className="mt-1 text-xs text-[#aaa]">
                {remainRuns == null
                  ? "即将自动返回刷卡页"
                  : remainRuns > 0
                    ? `今日剩余可玩 ${remainRuns} 次（含正式/练习规则）`
                    : "今日正式次数已用尽，继续将进入练习局"}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                className="btn-game rounded-lg px-6 py-3 text-base font-semibold"
                onClick={() => void continuePlay()}
              >
                继续游戏
                {remainRuns != null ? `（剩 ${remainRuns}）` : ""}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#666] bg-[#222] px-6 py-3"
                onClick={endPlay}
              >
                结束游戏
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#ff334450] bg-transparent px-6 py-3 text-[#ffd56a]"
                onClick={() => {
                  pausedRef.current = true;
                  router.push("/leaderboard");
                }}
              >
                排行榜
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </GameShell>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <div className="text-xs text-[#bbb]">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
