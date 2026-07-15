"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { clearSession, getSession } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { playSfx } from "@/lib/sfx";
import { apiUrl } from "@/lib/public-env";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { getTerminalSessionId, setTerminalState } from "@/lib/terminal-state";

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

  // 提交未完成前不心跳，避免卡顿下会话过期强制回首页打断提交
  useHeartbeat(phase === "done");

  useEffect(() => {
    setTerminalState("SUBMITTING");
    const payloadRaw = sessionStorage.getItem("qzgs_result_payload");
    if (!payloadRaw) {
      setTerminalState("WAITING_CARD");
      window.setTimeout(() => router.replace("/"), 0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const payload = JSON.parse(payloadRaw);
        const res = await fetch(apiUrl("/api/game/submit"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "提交失败");
        if (cancelled) return;
        setResult(json);
        setPhase("done");
        setTerminalState("RESULT");
        playSfx("combo", 0.45);

        // refresh quota
        const s = getSession();
        const terminalSessionId = getTerminalSessionId();
        const reg = await fetch(apiUrl("/api/player/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: s.cardId,
            phone: s.phone,
            nickname: s.nickname,
            deviceCode: s.deviceCode,
            terminalSessionId,
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
        const raw = e instanceof Error ? e.message : "提交失败";
        setError(
          raw === "Failed to fetch"
            ? "网络繁忙，成绩提交失败，请返回重试"
            : raw,
        );
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
      setTerminalState("WAITING_CARD");
      router.replace("/");
    }, 0);
  }, [phase, countdown, router]);

  async function continuePlay() {
    pausedRef.current = true;
    const s = getSession();
    const terminalSessionId = getTerminalSessionId();
    const res = await fetch(apiUrl("/api/game/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: s.playerId,
        cardId: s.cardId,
        deviceCode: s.deviceCode,
        terminalSessionId,
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
    clearSession();
    setTerminalState("WAITING_CARD");
    router.replace("/");
  }

  return (
    <GameShell scene="hud">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-10">
        <div className="mb-6 text-center">
          <h1 className="font-display title-glow text-4xl tracking-wider text-[#ff3b45]">战绩结算</h1>
        </div>
        {phase === "submitting" && (
          <div className="hud-frame text-center text-[#aaa]">成绩校验提交中…</div>
        )}
        {phase === "error" && (
          <div className="panel-glow hud-frame rounded-2xl p-8 text-center">
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
            className="panel-glow hud-frame rounded-2xl p-8 text-center"
          >
            <div className="text-[#aaa]">测试完成</div>
            <div className="font-display mt-3 text-3xl tracking-wide text-[#ff3b45]">
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
                className="hud-frame rounded-lg px-6 py-3 text-[#ddd] hover:text-white"
                onClick={endPlay}
              >
                结束游戏
              </button>
              <button
                type="button"
                className="hud-frame rounded-lg px-6 py-3 text-[#ffd56a] hover:text-white"
                onClick={() => {
                  pausedRef.current = true;
                  setTerminalState("RANKING");
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
