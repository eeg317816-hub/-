"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSession } from "@/lib/client";
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

const PAGE = 10;

export default function LeaderboardPage() {
  const router = useRouter();
  const [type, setType] = useState<"today" | "all">("all");
  const [list, setList] = useState<Row[]>([]);
  const [myRank, setMyRank] = useState<Row | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreDown, setHasMoreDown] = useState(true);
  const [hasMoreUp, setHasMoreUp] = useState(false);
  const [minOffset, setMinOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const myRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const bottomSentinel = useRef<HTMLDivElement>(null);
  const scrollBox = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const nickname =
    typeof window !== "undefined" ? getSession().nickname || "" : "";

  const fetchSlice = useCallback(
    async (offset: number) => {
      const q = new URLSearchParams({
        type,
        offset: String(offset),
        limit: String(PAGE),
      });
      if (nickname) q.set("nickname", nickname);
      const res = await fetch(`/api/leaderboard?${q}`);
      return res.json();
    },
    [type, nickname],
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    busy.current = true;
    try {
      // first probe to get myRank
      const probe = await fetchSlice(0);
      if (!probe.success) return;
      setTotal(probe.total || 0);
      setMyRank(probe.myRank || null);

      let start = 0;
      if (probe.myRank?.rank) {
        start = Math.floor((probe.myRank.rank - 1) / PAGE) * PAGE;
      }
      const page = start === 0 ? probe : await fetchSlice(start);
      if (!page.success) return;
      const rows: Row[] = page.list || [];
      setList(rows);
      setMinOffset(start);
      setMaxOffset(start + rows.length);
      setHasMoreUp(start > 0);
      setHasMoreDown(start + rows.length < (page.total || 0));
      if (page.myRank) setMyRank(page.myRank);
    } finally {
      setLoading(false);
      busy.current = false;
      requestAnimationFrame(() => {
        myRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, [fetchSlice]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const loadDown = useCallback(async () => {
    if (busy.current || !hasMoreDown) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchSlice(maxOffset);
      if (!page.success) return;
      const rows: Row[] = page.list || [];
      setList((prev) => mergeRows(prev, rows));
      setMaxOffset(maxOffset + rows.length);
      setHasMoreDown(maxOffset + rows.length < (page.total || 0));
      if (page.myRank) setMyRank(page.myRank);
    } finally {
      setLoadingMore(false);
      busy.current = false;
    }
  }, [fetchSlice, hasMoreDown, maxOffset]);

  const loadUp = useCallback(async () => {
    if (busy.current || !hasMoreUp || minOffset <= 0) return;
    busy.current = true;
    setLoadingMore(true);
    const box = scrollBox.current;
    const prevHeight = box?.scrollHeight || 0;
    try {
      const nextMin = Math.max(0, minOffset - PAGE);
      const page = await fetchSlice(nextMin);
      if (!page.success) return;
      const rows: Row[] = page.list || [];
      setList((prev) => mergeRows(rows, prev));
      setMinOffset(nextMin);
      setHasMoreUp(nextMin > 0);
      if (page.myRank) setMyRank(page.myRank);
      requestAnimationFrame(() => {
        if (box) {
          const delta = box.scrollHeight - prevHeight;
          box.scrollTop += delta;
        }
      });
    } finally {
      setLoadingMore(false);
      busy.current = false;
    }
  }, [fetchSlice, hasMoreUp, minOffset]);

  useEffect(() => {
    const bottom = bottomSentinel.current;
    const top = topSentinel.current;
    const root = scrollBox.current;
    if (!bottom || !top || !root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (e.target === bottom) void loadDown();
          if (e.target === top) void loadUp();
        }
      },
      { root, rootMargin: "120px" },
    );
    io.observe(bottom);
    io.observe(top);
    return () => io.disconnect();
  }, [loadDown, loadUp, list.length]);

  return (
    <GameShell scene="stage">
      <div className="mx-auto flex h-screen max-w-3xl flex-col px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display title-glow text-4xl tracking-wider text-[#ffe9a8]">
            荣耀排行榜
          </h1>
          <button
            type="button"
            className="text-sm text-[#ccc] underline"
            onClick={() => router.push("/")}
          >
            回首页
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          {(
            [
              ["today", "今日榜"],
              ["all", "总榜"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setType(k)}
              className={`rounded-lg px-4 py-2 ${
                type === k ? "btn-game" : "border border-[#444] bg-black/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {myRank && (
          <div className="mb-3 rounded-xl border border-[#ffd56a66] bg-[#ff334418] px-4 py-3 text-sm">
            我的排名：第 <span className="font-tech text-[#ffd56a]">{myRank.rank}</span> 名
            · {myRank.score} 分 · {myRank.rankLevel} {myRank.rankTitle}
            <span className="ml-2 text-[#888]">共 {total} 人</span>
          </div>
        )}

        <div
          ref={scrollBox}
          className="panel-glow relative flex-1 space-y-2 overflow-y-auto rounded-2xl p-3"
        >
          <div ref={topSentinel} className="py-2 text-center text-xs text-[#666]">
            {loadingMore && hasMoreUp ? "加载上一页…" : hasMoreUp ? "上滑加载更多" : ""}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-[#aaa]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#ffd56a] border-t-transparent" />
              加载中…
            </div>
          )}

          {!loading && list.length === 0 && (
            <p className="py-16 text-center text-[#666]">暂无成绩</p>
          )}

          {list.map((row) => {
            const isMe = Boolean(nickname && row.nickname === nickname);
            return (
              <motion.div
                key={row.playerId}
                layout
                ref={isMe ? myRef : undefined}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  isMe
                    ? "border-[#ffd56a] bg-[#ff334433] shadow-[0_0_24px_#ff334455] ring-2 ring-[#ffd56a88]"
                    : row.rank <= 3
                      ? "border-[#ffd56a44] bg-[#2a1a10]/70"
                      : "border-[#ffffff12] bg-black/25"
                }`}
              >
                <div className="font-tech w-10 text-center text-xl text-[#ff3344]">
                  {row.rank}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {row.nickname}
                    {isMe && <span className="ml-2 text-xs text-[#ffd56a]">我</span>}
                    <span className="ml-2 text-xs text-[#888]">
                      {row.rankLevel} · {row.rankTitle}
                    </span>
                  </div>
                  <div className="text-xs text-[#888]">
                    {row.phoneMasked} · APM {row.apm} · 正确率 {row.accuracy}% · 连击{" "}
                    {row.maxCombo}
                  </div>
                </div>
                <div className="text-xl font-bold text-[#ffe9a8]">{row.score}</div>
              </motion.div>
            );
          })}

          <div ref={bottomSentinel} className="py-4 text-center text-sm text-[#888]">
            {loadingMore && hasMoreDown ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffd56a] border-t-transparent" />
                加载中…
              </span>
            ) : hasMoreDown ? (
              "下滑加载下一页"
            ) : list.length > 0 ? (
              "已经到底了"
            ) : null}
          </div>
        </div>
      </div>
    </GameShell>
  );
}

function mergeRows(a: Row[], b: Row[]) {
  const map = new Map<number, Row>();
  for (const r of a) map.set(r.playerId, r);
  for (const r of b) map.set(r.playerId, r);
  return Array.from(map.values()).sort((a, b) => a.rank - b.rank);
}
