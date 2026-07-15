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
      className={`${BOARD_GRID} border-b border-[#ffffff18] px-3 py-2.5 text-xs tracking-wider text-[#888]`}
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
}: {
  row: BoardRow;
  highlight?: boolean;
  /** @deprecated 前台排行榜不再展示手机号；保留参数以免旧调用报错 */
  showPhone?: boolean;
}) {
  return (
    <div
      className={`${BOARD_GRID} rounded-xl border px-3 py-3.5 ${
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
          className="truncate text-[1.05rem] font-semibold leading-snug tracking-wide text-white"
          title={row.nickname}
        >
          {displayNickname(row.nickname, 10)}
          {highlight && (
            <span className="ml-1.5 align-middle text-xs font-normal text-[#ff6b73]">我</span>
          )}
        </div>
      </div>
      <div className="min-w-0 overflow-hidden">
        <div className="truncate text-sm leading-snug text-[#ff6b73]">{row.rankLevel}</div>
        <div className="truncate text-xs leading-snug text-[#888]">{row.rankTitle}</div>
      </div>
      <div className="min-w-0 overflow-hidden text-sm text-[#ccc]">
        <div className="truncate leading-snug tabular-nums">APM {row.apm}</div>
        <div className="truncate text-xs leading-snug tabular-nums text-[#888]">
          连击 {row.maxCombo}
        </div>
      </div>
      <div className="text-right text-xl font-bold tabular-nums leading-none text-[#ff3b45]">
        {row.score}
      </div>
    </div>
  );
}
