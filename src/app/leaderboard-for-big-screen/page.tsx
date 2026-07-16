"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameShell } from "@/components/GameShell";
import { setTerminalState } from "@/lib/terminal-state";
import { apiUrl } from "@/lib/public-env";
import { displayNickname } from "@/lib/nickname";

type Row = {
  rank: number;
  playerId: number;
  nickname: string;
  phoneMasked: string;
  score: number;
  rankLevel: string;
  rankTitle: string;
  apm: number;
  accuracy: number;
  maxCombo: number;
  createdAt: string;
};

/** 大屏下列轮播：从第 4 名起，每页 10 人（不是旧的 20） */
const PAGE_SIZE = 10;
const PAGE_DWELL_MS = 8000;
const PAGE_ANIM_MS = 400;
const POLL_MS = 15_000;

export default function BigScreenLeaderboardPage() {
  useEffect(() => {
    setTerminalState("RANKING");
  }, []);

  const [list, setList] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [version, setVersion] = useState("");
  const [pulse, setPulse] = useState(false);
  const [clock, setClock] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const versionRef = useRef("");
  const pendingRef = useRef<{ list: Row[]; total: number; version: string } | null>(null);
  const pageIndexRef = useRef(0);
  const applyPendingAtCycleEndRef = useRef(false);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);
  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  const applyPayload = useCallback((payload: { list: Row[]; total: number; version: string }, softPulse: boolean) => {
    setList(payload.list);
    setTotal(payload.total);
    setVersion(payload.version);
    if (softPulse) {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);
    }
    const restCount = Math.max(0, payload.list.filter((r) => r.rank > 3).length);
    const pages = Math.max(1, Math.ceil(restCount / PAGE_SIZE) || 1);
    setPageIndex((p) => (restCount === 0 ? 0 : Math.min(p, pages - 1)));
  }, []);

  const fetchBoard = useCallback(async (initial: boolean) => {
    try {
      const res = await fetch(apiUrl("/api/leaderboard/display?type=all"));
      const json = await res.json();
      if (!json.success) return;
      const next = {
        list: (json.list || []) as Row[],
        total: Number(json.total || 0),
        version: String(json.version || ""),
      };
      if (initial || !versionRef.current) {
        applyPayload(next, false);
        return;
      }
      if (next.version === versionRef.current) return;
      // 有更新：等当前页播完再换，避免轮播中途跳
      pendingRef.current = next;
      applyPendingAtCycleEndRef.current = true;
    } catch {
      // ignore transient
    } finally {
      if (initial) setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    void fetchBoard(true);
    const t = window.setInterval(() => void fetchBoard(false), POLL_MS);
    return () => window.clearInterval(t);
  }, [fetchBoard]);

  const top3 = useMemo(() => list.filter((r) => r.rank <= 3), [list]);
  const rest = useMemo(() => list.filter((r) => r.rank > 3), [list]);
  const pageCount = Math.max(1, Math.ceil(rest.length / PAGE_SIZE) || 1);
  const pageRows = rest.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);

  const restLenRef = useRef(0);
  restLenRef.current = rest.length;

  useEffect(() => {
    if (rest.length === 0) {
      setPageIndex(0);
      return;
    }
    const t = window.setInterval(() => {
      if (applyPendingAtCycleEndRef.current && pendingRef.current) {
        applyPayload(pendingRef.current, true);
        pendingRef.current = null;
        applyPendingAtCycleEndRef.current = false;
        setPageIndex(0);
        return;
      }
      const pages = Math.max(1, Math.ceil(restLenRef.current / PAGE_SIZE));
      setPageIndex((p) => (p + 1) % pages);
    }, PAGE_DWELL_MS);
    return () => window.clearInterval(t);
  }, [rest.length, applyPayload]);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Intl.DateTimeFormat("zh-CN", {
          timeZone: "Asia/Shanghai",
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

  return (
    <GameShell scene="hud" className="!h-[100dvh] !min-h-[100dvh] !overflow-hidden">
      <div className="mx-auto flex h-[100dvh] w-full max-w-[2160px] flex-col px-[3vw] py-[2.2vh]">
        <header className="mb-[2vh] flex shrink-0 items-end justify-between gap-4">
          <div>
            <p className="font-tech text-[clamp(0.75rem,1.1vw,1.1rem)] tracking-[0.35em] text-[#ffd56a]">
              THE KING&apos;S AVATAR · LIVE RANKING
            </p>
            <h1 className="font-display title-glow mt-[0.6vh] text-[clamp(2.4rem,5.5vw,5.5rem)] tracking-[0.12em] text-[#ff3b45]">
              总排行榜
            </h1>
          </div>
          <div className="text-right">
            <div className="font-tech text-[clamp(1.6rem,3.2vw,3.2rem)] text-white">{clock}</div>
            <div className="mt-1 text-[clamp(0.8rem,1.2vw,1.15rem)] text-[#aaa]">
              实时更新 · 共 {total} 人 · 展示 Top {Math.min(100, total)}
              {pulse && <span className="ml-2 text-[#7CFFB2]">榜单已刷新</span>}
            </div>
          </div>
        </header>

        <div className="mb-[2vh] grid shrink-0 gap-[1.2vw] md:grid-cols-3">
          {[2, 1, 3].map((podiumRank) => {
            const row = top3.find((r) => r.rank === podiumRank);
            const styles =
              podiumRank === 1
                ? "md:order-2 border-[#ffd56a] bg-gradient-to-b from-[#5a3a10]/80 to-[#1a1008]/90 shadow-[0_0_40px_rgba(255,213,106,0.35)] scale-[1.03]"
                : podiumRank === 2
                  ? "md:order-1 border-[#c0c8d8] bg-gradient-to-b from-[#2a3140]/80 to-[#12151c]/90"
                  : "md:order-3 border-[#c47a4a] bg-gradient-to-b from-[#3a2214]/80 to-[#140c08]/90";
            return (
              <div
                key={podiumRank}
                className={`overflow-hidden rounded-2xl border px-[1.5vw] py-[1.8vh] text-center ${styles}`}
              >
                <div className="font-tech text-[clamp(0.75rem,1.1vw,1rem)] tracking-widest text-[#ffd56a]">
                  NO.{podiumRank}
                </div>
                {row ? (
                  <>
                    <div
                      className="font-display mx-auto mt-[1vh] max-w-full truncate px-1 text-[clamp(1.6rem,3vw,2.8rem)] leading-normal text-white"
                      title={row.nickname}
                    >
                      {displayNickname(row.nickname, 10)}
                    </div>
                    <div className="mt-[0.6vh] text-[clamp(2rem,4vw,3.6rem)] font-black tabular-nums text-[#ff3b45]">
                      {row.score}
                    </div>
                    <div className="mt-[0.5vh] truncate text-[clamp(0.8rem,1.2vw,1.1rem)] text-[#bbb]">
                      {row.rankLevel} · {row.rankTitle}
                    </div>
                    <div className="mt-1 text-[clamp(0.7rem,1vw,0.95rem)] tabular-nums text-[#888]">
                      APM {row.apm} · 连击 {row.maxCombo} · {row.accuracy}%
                    </div>
                  </>
                ) : (
                  <div className="mt-[2vh] text-[clamp(1rem,1.6vw,1.4rem)] text-[#666]">虚位以待</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="panel-glow flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="shrink-0 border-b border-[#ffffff18] px-[1.2vw] py-[1vh]">
            <div className="grid grid-cols-[0.7fr_2fr_1.6fr_1.6fr_1fr] items-center gap-2 text-[clamp(0.75rem,1.1vw,1.05rem)] tracking-wider text-[#888]">
              <div className="text-center">排名</div>
              <div>选手</div>
              <div>段位</div>
              <div>APM / 连击</div>
              <div className="text-right">综合分</div>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden px-[1.2vw] py-[1vh]">
            {loading && list.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#888]">加载中…</div>
            ) : rest.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#888]">暂无更多排名</div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={pageIndex}
                  className="flex h-full flex-col justify-stretch gap-[0.7vh]"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -28 }}
                  transition={{ duration: PAGE_ANIM_MS / 1000, ease: "easeOut" }}
                >
                  {Array.from({ length: PAGE_SIZE }).map((_, slot) => {
                    const row = pageRows[slot];
                    return (
                      <div
                        key={row ? row.playerId : `empty-${slot}`}
                        className="grid min-h-0 flex-1 grid-cols-[0.7fr_2fr_1.6fr_1.6fr_1fr] items-center gap-2 rounded-xl border border-[#ffffff12] bg-black/25 px-[1vw] py-[0.4vh]"
                      >
                        {row ? (
                          <>
                            <div className="font-tech text-center text-[clamp(1.2rem,2.2vw,2rem)] tabular-nums text-[#ff3344]">
                              {row.rank}
                            </div>
                            <div className="flex min-w-0 items-center overflow-x-hidden overflow-y-visible py-[0.15em]">
                              <div
                                className="truncate text-[clamp(1.15rem,2vw,1.85rem)] font-semibold leading-normal tracking-wide text-white"
                                title={row.nickname}
                              >
                                {displayNickname(row.nickname, 10)}
                              </div>
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <div className="truncate text-[clamp(0.9rem,1.4vw,1.25rem)] text-[#ff6b73]">
                                {row.rankLevel}
                              </div>
                              <div className="truncate text-[clamp(0.7rem,1vw,0.95rem)] text-[#888]">
                                {row.rankTitle}
                              </div>
                            </div>
                            <div className="min-w-0 overflow-hidden text-[clamp(0.85rem,1.3vw,1.2rem)] text-[#ccc]">
                              <div className="truncate tabular-nums">APM {row.apm}</div>
                              <div className="truncate text-[clamp(0.7rem,1vw,0.95rem)] tabular-nums text-[#888]">
                                连击 {row.maxCombo}
                              </div>
                            </div>
                            <div className="text-right text-[clamp(1.2rem,2.2vw,2rem)] font-bold tabular-nums text-[#ff3b45]">
                              {row.score}
                            </div>
                          </>
                        ) : (
                          <div className="col-span-5 text-center text-[#333]">—</div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between px-[1.2vw] py-[0.8vh] text-[clamp(0.75rem,1.1vw,1rem)] text-[#888]">
            <span>
              {rest.length > 0
                ? `第 ${pageIndex + 1}/${pageCount} 页 · 排名 ${pageRows[0]?.rank ?? "-"}–${pageRows[pageRows.length - 1]?.rank ?? "-"}`
                : "仅 Top3"}
            </span>
            <span>本地轮播 · 8s / 页</span>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
