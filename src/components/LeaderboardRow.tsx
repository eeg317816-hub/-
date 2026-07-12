"use client";

import { displayNickname } from "@/lib/nickname";

export type BoardRow = {
  rank: number;
  playerId: number;
  nickname: string;
  phoneMasked?: string;
  score: number;
  rankLevel: string;
  rankTitle: string;
  apm: number;
  accuracy?: number;
  maxCombo: number;
};

/** 统一列宽，避免长短不一导致错位 */
export const BOARD_GRID =
  "grid grid-cols-[56px_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_88px] items-center gap-2";

export function BoardHeader() {
  return (
    <div
      className={`${BOARD_GRID} border-b border-[#ffffff18] px-3 py-2 text-xs tracking-wider text-[#888]`}
    >
      <div className="text-center">排名</div>
      <div>选手</div>
      <div>段位</div>
      <div>APM / 连击</div>
      <div className="text-right">综合分</div>
    </div>
  );
}

export function BoardRowView({
  row,
  highlight,
  showPhone,
}: {
  row: BoardRow;
  highlight?: boolean;
  showPhone?: boolean;
}) {
  return (
    <div
      className={`${BOARD_GRID} rounded-xl border px-3 py-3 ${
        highlight
          ? "border-[#ffd56a] bg-[#ff334433] shadow-[0_0_24px_#ff334455] ring-2 ring-[#ffd56a88]"
          : row.rank <= 3
            ? "border-[#ffd56a44] bg-[#2a1a10]/70"
            : "border-[#ffffff12] bg-black/25"
      }`}
    >
      <div className="font-tech text-center text-xl tabular-nums text-[#ff3344]">
        {row.rank}
      </div>
      <div className="min-w-0 overflow-hidden">
        <div
          className="truncate font-semibold"
          title={row.nickname}
          style={{ maxWidth: "10em" }}
        >
          {displayNickname(row.nickname, 10)}
          {highlight && (
            <span className="ml-1 text-xs text-[#ffd56a]">我</span>
          )}
        </div>
        {showPhone && row.phoneMasked && (
          <div className="truncate text-xs text-[#777]">{row.phoneMasked}</div>
        )}
      </div>
      <div className="min-w-0 overflow-hidden">
        <div className="truncate text-sm text-[#ffd56a]">{row.rankLevel}</div>
        <div className="truncate text-xs text-[#888]">{row.rankTitle}</div>
      </div>
      <div className="min-w-0 overflow-hidden text-sm text-[#ccc]">
        <div className="truncate tabular-nums">APM {row.apm}</div>
        <div className="truncate text-xs text-[#888] tabular-nums">
          连击 {row.maxCombo}
        </div>
      </div>
      <div className="text-right text-xl font-bold tabular-nums text-[#ffe9a8]">
        {row.score}
      </div>
    </div>
  );
}
