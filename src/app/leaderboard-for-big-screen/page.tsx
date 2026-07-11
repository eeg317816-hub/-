"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameShell } from "@/components/GameShell";

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

const PAGE = 20;
const POLL_MS = 2500;

export default function BigScreenLeaderboardPage() {
  const [list, setList] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [version, setVersion] = useState("");
  const [pulse, setPulse] = useState(false);
  const [clock, setClock] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const listRef = useRef<Row[]>([]);
  const versionRef = useRef("");

  useEffect(() => {
    listRef.current = list;
  }, [list]);
  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const fetchPage = useCallback(async (nextOffset: number, replace: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?type=all&offset=${nextOffset}&limit=${PAGE}`,
      );
      const json = await res.json();
      if (!json.success) return;
      const rows: Row[] = json.list || [];
      setTotal(json.total || 0);
      setHasMore(Boolean(json.hasMore));
      setOffset(nextOffset + rows.length);
      if (json.version) setVersion(json.version);
      setList((prev) => (replace ? rows : mergeByRank(prev, rows)));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // initial
  useEffect(() => {
    void fetchPage(0, true);
  }, [fetchPage]);

  // realtime poll: refresh first page / full loaded window when top20 changes
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const loaded = Math.max(listRef.current.length, PAGE);
        const res = await fetch(
          `/api/leaderboard?type=all&offset=0&limit=${loaded}`,
        );
        const json = await res.json();
        if (!json.success) return;
        if (json.version && json.version !== versionRef.current) {
          setVersion(json.version);
          setPulse(true);
          setTimeout(() => setPulse(false), 1200);
          setList(json.list || []);
          setTotal(json.total || 0);
          setOffset((json.list || []).length);
          setHasMore(Boolean(json.hasMore));
        }
      } catch {
        // ignore
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  // infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
          void fetchPage(offset, false);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [offset, hasMore, fetchPage]);

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

  const top3 = list.filter((r) => r.rank <= 3);
  const rest = list.filter((r) => r.rank > 3);

  return (
    <GameShell scene="arena" className="!min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 md:px-10">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-tech text-sm tracking-[0.35em] text-[#ffd56a]">
              THE KING&apos;S AVATAR · LIVE RANKING
            </p>
            <h1 className="font-display title-glow mt-2 text-5xl tracking-[0.12em] text-[#ffe9a8] md:text-7xl">
              总排行榜
            </h1>
          </div>
          <div className="text-right">
            <div className="font-tech text-3xl text-white md:text-4xl">{clock}</div>
            <div className="mt-1 text-sm text-[#aaa]">
              实时更新 · 共 {total} 人
              {pulse && <span className="ml-2 text-[#7CFFB2]">榜单已刷新</span>}
            </div>
          </div>
        </header>

        {/* Top 3 podium */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[2, 1, 3].map((podiumRank) => {
            const row = top3.find((r) => r.rank === podiumRank);
            const styles =
              podiumRank === 1
                ? "md:order-2 border-[#ffd56a] bg-gradient-to-b from-[#5a3a10]/80 to-[#1a1008]/90 shadow-[0_0_40px_rgba(255,213,106,0.35)] scale-105"
                : podiumRank === 2
                  ? "md:order-1 border-[#c0c8d8] bg-gradient-to-b from-[#2a3140]/80 to-[#12151c]/90"
                  : "md:order-3 border-[#c47a4a] bg-gradient-to-b from-[#3a2214]/80 to-[#140c08]/90";
            return (
              <motion.div
                key={podiumRank}
                layout
                className={`rounded-2xl border px-5 py-6 text-center ${styles}`}
              >
                <div className="font-tech text-sm tracking-widest text-[#ffd56a]">
                  NO.{podiumRank}
                </div>
                {row ? (
                  <>
                    <div className="font-display mt-3 text-3xl text-white md:text-4xl">
                      {row.nickname}
                    </div>
                    <div className="mt-2 text-4xl font-black text-[#ffe9a8] md:text-5xl">
                      {row.score}
                    </div>
                    <div className="mt-2 text-sm text-[#bbb]">
                      {row.rankLevel} · {row.rankTitle}
                    </div>
                    <div className="mt-1 text-xs text-[#888]">
                      APM {row.apm} · 连击 {row.maxCombo} · {row.accuracy}%
                    </div>
                  </>
                ) : (
                  <div className="mt-6 text-[#666]">虚位以待</div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="panel-glow flex-1 overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[80px_1fr_140px_160px_120px] gap-2 border-b border-[#ffffff18] px-5 py-3 text-xs tracking-wider text-[#888]">
            <div>排名</div>
            <div>选手</div>
            <div>段位</div>
            <div>APM / 连击</div>
            <div className="text-right">综合分</div>
          </div>
          <div className="max-h-[52vh] space-y-1 overflow-y-auto px-3 py-3">
            <AnimatePresence initial={false}>
              {rest.map((row) => (
                <motion.div
                  key={row.playerId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-[80px_1fr_140px_160px_120px] items-center gap-2 rounded-xl border border-transparent px-2 py-3 hover:border-[#ff334440] hover:bg-white/5"
                >
                  <div className="font-tech text-2xl text-[#ff3344]">{row.rank}</div>
                  <div>
                    <div className="text-xl font-semibold">{row.nickname}</div>
                    <div className="text-xs text-[#777]">{row.phoneMasked}</div>
                  </div>
                  <div className="text-sm text-[#ffd56a]">
                    {row.rankLevel}
                    <div className="text-xs text-[#888]">{row.rankTitle}</div>
                  </div>
                  <div className="text-sm text-[#ccc]">
                    APM {row.apm}
                    <div className="text-xs text-[#888]">连击 {row.maxCombo}</div>
                  </div>
                  <div className="text-right text-2xl font-bold text-[#ffe9a8]">
                    {row.score}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div ref={sentinelRef} className="py-6 text-center text-sm text-[#888]">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffd56a] border-t-transparent" />
                  加载中…
                </span>
              ) : hasMore ? (
                "下滑加载更多"
              ) : list.length > 0 ? (
                "已加载全部"
              ) : (
                "暂无成绩"
              )}
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  );
}

function mergeByRank(prev: Row[], next: Row[]) {
  const map = new Map<number, Row>();
  for (const r of prev) map.set(r.playerId, r);
  for (const r of next) map.set(r.playerId, r);
  return Array.from(map.values()).sort((a, b) => a.rank - b.rank);
}
