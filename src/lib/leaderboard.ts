import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { formatDateTime, maskPhone } from "./api";
import { getConfigBool } from "./config";
import {
  getCachedDisplayBoard,
  setCachedDisplayBoard,
  type DisplayBoardPayload,
} from "./leaderboard-cache";

export type { DisplayBoardPayload };

export type LeaderboardType = "today" | "all";

export type LeaderboardRow = {
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

const TZ = "Asia/Shanghai";

export function shanghaiDayKey(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function boardPeriod(type: LeaderboardType) {
  return type === "today"
    ? { board: "today" as const, periodKey: shanghaiDayKey() }
    : { board: "all" as const, periodKey: "" };
}

function isBetterBest(
  next: { score: number; accuracy: number; maxCombo: number; errorCount: number; achievedAt: Date },
  cur: { score: number; accuracy: Prisma.Decimal | number; maxCombo: number; errorCount: number; achievedAt: Date },
) {
  if (next.score !== cur.score) return next.score > cur.score;
  const curAcc = Number(cur.accuracy);
  if (next.accuracy !== curAcc) return next.accuracy > curAcc;
  if (next.maxCombo !== cur.maxCombo) return next.maxCombo > cur.maxCombo;
  if (next.errorCount !== cur.errorCount) return next.errorCount < cur.errorCount;
  return next.achievedAt < cur.achievedAt;
}

/** 提交有效成绩后写入 / 更新最佳快照（总榜 + 今日榜） */
export async function upsertPlayerBestFromSession(session: {
  id: bigint;
  playerId: bigint;
  score: number;
  rankLevel: string;
  rankTitle: string;
  apm: number;
  accuracy: Prisma.Decimal | number;
  maxCombo: number;
  errorCount: number;
  isValid: boolean;
  cheatFlag: boolean;
  endedAt: Date | null;
  createdAt: Date;
}) {
  if (!session.isValid || session.cheatFlag || !session.endedAt) return { updatedAll: false, updatedToday: false };

  const achievedAt = session.endedAt;
  const accuracy = Number(session.accuracy);
  const payload = {
    score: session.score,
    rankLevel: session.rankLevel,
    rankTitle: session.rankTitle,
    apm: session.apm,
    accuracy: new Prisma.Decimal(accuracy.toFixed(2)),
    maxCombo: session.maxCombo,
    errorCount: session.errorCount,
    gameSessionId: session.id,
    achievedAt,
  };

  let updatedAll = false;
  let updatedToday = false;

  const existingAll = await prisma.playerBestScore.findUnique({
    where: {
      playerId_board_periodKey: {
        playerId: session.playerId,
        board: "all",
        periodKey: "",
      },
    },
  });
  if (
    !existingAll ||
    isBetterBest(
      { score: session.score, accuracy, maxCombo: session.maxCombo, errorCount: session.errorCount, achievedAt },
      existingAll,
    )
  ) {
    await prisma.playerBestScore.upsert({
      where: {
        playerId_board_periodKey: {
          playerId: session.playerId,
          board: "all",
          periodKey: "",
        },
      },
      create: {
        playerId: session.playerId,
        board: "all",
        periodKey: "",
        ...payload,
      },
      update: payload,
    });
    updatedAll = true;
  }

  const dayKey = shanghaiDayKey(achievedAt);
  const existingToday = await prisma.playerBestScore.findUnique({
    where: {
      playerId_board_periodKey: {
        playerId: session.playerId,
        board: "today",
        periodKey: dayKey,
      },
    },
  });
  if (
    !existingToday ||
    isBetterBest(
      { score: session.score, accuracy, maxCombo: session.maxCombo, errorCount: session.errorCount, achievedAt },
      existingToday,
    )
  ) {
    await prisma.playerBestScore.upsert({
      where: {
        playerId_board_periodKey: {
          playerId: session.playerId,
          board: "today",
          periodKey: dayKey,
        },
      },
      create: {
        playerId: session.playerId,
        board: "today",
        periodKey: dayKey,
        ...payload,
      },
      update: payload,
    });
    updatedToday = true;
  }

  return { updatedAll, updatedToday };
}

/** 从明细回填快照（空表或部署后首次） */
async function backfillBestScores(type: LeaderboardType) {
  const { board, periodKey } = boardPeriod(type);
  const count = await prisma.playerBestScore.count({ where: { board, periodKey } });
  if (count > 0) return;

  const validOnly = await getConfigBool("leaderboard_valid_only", true);
  const dateFilter =
    type === "today"
      ? Prisma.sql`AND (gs.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date = (NOW() AT TIME ZONE ${TZ})::date`
      : Prisma.empty;
  const validFilter = validOnly
    ? Prisma.sql`AND gs.is_valid = TRUE AND gs.cheat_flag = FALSE`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{
      player_id: bigint;
      score: number;
      rank_level: string;
      rank_title: string;
      apm: number;
      accuracy: Prisma.Decimal | number;
      max_combo: number;
      error_count: number;
      game_session_id: bigint;
      achieved_at: Date;
    }>
  >`
    SELECT
      player_id, score, rank_level, rank_title, apm, accuracy,
      max_combo, error_count, game_session_id, achieved_at
    FROM (
      SELECT
        gs.player_id,
        gs.score,
        gs.rank_level,
        gs.rank_title,
        gs.apm,
        gs.accuracy,
        gs.max_combo,
        gs.error_count,
        gs.id AS game_session_id,
        COALESCE(gs.ended_at, gs.created_at) AS achieved_at,
        ROW_NUMBER() OVER (
          PARTITION BY gs.player_id
          ORDER BY gs.score DESC, gs.accuracy DESC, gs.max_combo DESC, gs.error_count ASC, gs.created_at ASC
        ) AS player_best_rank
      FROM game_sessions gs
      WHERE gs.ended_at IS NOT NULL
        ${validFilter}
        ${dateFilter}
    ) t
    WHERE t.player_best_rank = 1
  `;

  if (rows.length === 0) return;

  await prisma.playerBestScore.createMany({
    data: rows.map((r) => ({
      playerId: r.player_id,
      board,
      periodKey,
      score: Number(r.score),
      rankLevel: r.rank_level,
      rankTitle: r.rank_title,
      apm: Number(r.apm),
      accuracy: new Prisma.Decimal(Number(r.accuracy).toFixed(2)),
      maxCombo: Number(r.max_combo),
      errorCount: Number(r.error_count),
      gameSessionId: r.game_session_id,
      achievedAt: new Date(r.achieved_at),
    })),
    skipDuplicates: true,
  });
}

function mapRows(
  rows: Array<{
    playerId: bigint;
    nickname: string;
    phone: string;
    score: number;
    rankLevel: string;
    rankTitle: string;
    apm: number;
    accuracy: Prisma.Decimal | number;
    maxCombo: number;
    achievedAt: Date;
    rn: bigint | number;
  }>,
): LeaderboardRow[] {
  return rows.map((r) => ({
    rank: Number(r.rn),
    playerId: Number(r.playerId),
    nickname: r.nickname,
    phoneMasked: maskPhone(r.phone),
    score: Number(r.score),
    rankLevel: r.rankLevel,
    rankTitle: r.rankTitle,
    apm: Number(r.apm),
    accuracy: Number(r.accuracy),
    maxCombo: Number(r.maxCombo),
    createdAt: formatDateTime(new Date(r.achievedAt)),
  }));
}

async function queryRankedPage(params: {
  type: LeaderboardType;
  offset: number;
  limit: number;
}) {
  const { board, periodKey } = boardPeriod(params.type);
  await backfillBestScores(params.type);

  const rows = await prisma.$queryRaw<
    Array<{
      playerId: bigint;
      nickname: string;
      phone: string;
      score: number;
      rankLevel: string;
      rankTitle: string;
      apm: number;
      accuracy: Prisma.Decimal | number;
      maxCombo: number;
      achievedAt: Date;
      rn: bigint;
      total_count: bigint;
    }>
  >`
    WITH ranked AS (
      SELECT
        b.player_id AS "playerId",
        p.nickname,
        p.phone,
        b.score,
        b.rank_level AS "rankLevel",
        b.rank_title AS "rankTitle",
        b.apm,
        b.accuracy,
        b.max_combo AS "maxCombo",
        b.achieved_at AS "achievedAt",
        ROW_NUMBER() OVER (
          ORDER BY b.score DESC, b.accuracy DESC, b.max_combo DESC, b.error_count ASC, b.achieved_at ASC
        ) AS rn,
        COUNT(*) OVER () AS total_count
      FROM player_best_scores b
      JOIN players p ON p.id = b.player_id
      WHERE b.board = ${board}
        AND b.period_key = ${periodKey}
    )
    SELECT * FROM ranked
    ORDER BY rn ASC
    OFFSET ${params.offset}
    LIMIT ${params.limit}
  `;

  const list = mapRows(rows);
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return { list, total };
}

function versionFromList(list: LeaderboardRow[]) {
  return list
    .slice(0, 20)
    .map((t) => `${t.rank}:${t.playerId}:${t.score}`)
    .join("|");
}

export async function getDisplayLeaderboard(type: LeaderboardType): Promise<DisplayBoardPayload> {
  const cached = getCachedDisplayBoard(type);
  if (cached) return cached;

  const { list, total } = await queryRankedPage({ type, offset: 0, limit: 100 });
  const payload: DisplayBoardPayload = {
    list,
    total,
    version: versionFromList(list),
    updatedAt: Date.now(),
    type,
  };
  setCachedDisplayBoard(payload);
  return payload;
}

export async function getLeaderboardPage(params: {
  type: LeaderboardType;
  offset?: number;
  limit?: number;
  nickname?: string;
}) {
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(Math.max(1, params.limit ?? 20), 100);
  const { list, total } = await queryRankedPage({
    type: params.type,
    offset,
    limit,
  });

  let myRank: LeaderboardRow | null = null;
  if (params.nickname) {
    myRank = await getRankByNickname(params.type, params.nickname);
  }

  const top = await queryRankedPage({ type: params.type, offset: 0, limit: 20 });

  return {
    list,
    total,
    offset,
    limit,
    hasMore: offset + list.length < total,
    myRank,
    version: versionFromList(top.list),
    updatedAt: Date.now(),
  };
}

export async function getLeaderboard(type: LeaderboardType, limit = 100) {
  const page = await getLeaderboardPage({ type, offset: 0, limit });
  return page.list;
}

async function getRankByNickname(type: LeaderboardType, nickname: string) {
  const { board, periodKey } = boardPeriod(type);
  await backfillBestScores(type);
  const rows = await prisma.$queryRaw<
    Array<{
      playerId: bigint;
      nickname: string;
      phone: string;
      score: number;
      rankLevel: string;
      rankTitle: string;
      apm: number;
      accuracy: Prisma.Decimal | number;
      maxCombo: number;
      achievedAt: Date;
      rn: bigint;
    }>
  >`
    WITH ranked AS (
      SELECT
        b.player_id AS "playerId",
        p.nickname,
        p.phone,
        b.score,
        b.rank_level AS "rankLevel",
        b.rank_title AS "rankTitle",
        b.apm,
        b.accuracy,
        b.max_combo AS "maxCombo",
        b.achieved_at AS "achievedAt",
        ROW_NUMBER() OVER (
          ORDER BY b.score DESC, b.accuracy DESC, b.max_combo DESC, b.error_count ASC, b.achieved_at ASC
        ) AS rn
      FROM player_best_scores b
      JOIN players p ON p.id = b.player_id
      WHERE b.board = ${board}
        AND b.period_key = ${periodKey}
    )
    SELECT * FROM ranked WHERE nickname = ${nickname} LIMIT 1
  `;
  return rows[0] ? mapRows([{ ...rows[0], rn: rows[0].rn }])[0] : null;
}

/** 结果页名次：可超过 Top100 */
export async function getPlayerBoardRank(playerId: bigint, type: LeaderboardType = "today") {
  const { board, periodKey } = boardPeriod(type);
  await backfillBestScores(type);
  const rows = await prisma.$queryRaw<Array<{ rn: bigint }>>`
    SELECT rn FROM (
      SELECT
        player_id,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, accuracy DESC, max_combo DESC, error_count ASC, achieved_at ASC
        ) AS rn
      FROM player_best_scores
      WHERE board = ${board}
        AND period_key = ${periodKey}
    ) y
    WHERE player_id = ${playerId}
  `;
  return rows[0] ? Number(rows[0].rn) : null;
}

export async function getTodayRank(playerId: bigint) {
  return getPlayerBoardRank(playerId, "today");
}

export async function getPlayerBestScore(playerId: bigint) {
  const row = await prisma.playerBestScore.findUnique({
    where: {
      playerId_board_periodKey: {
        playerId,
        board: "all",
        periodKey: "",
      },
    },
  });
  if (row) return row.score;

  const legacy = await prisma.gameSession.findFirst({
    where: { playerId, isValid: true, cheatFlag: false, endedAt: { not: null } },
    orderBy: [
      { score: "desc" },
      { accuracy: "desc" },
      { maxCombo: "desc" },
      { errorCount: "asc" },
      { createdAt: "asc" },
    ],
  });
  return legacy?.score ?? 0;
}

/** 后台清榜后同步快照（下次读榜会从有效对局回填） */
export async function clearBestScores(type: "today" | "all") {
  if (type === "all") {
    await prisma.playerBestScore.deleteMany({});
    return;
  }
  await prisma.playerBestScore.deleteMany({
    where: { board: "today", periodKey: shanghaiDayKey() },
  });
  // 今日局可能被标无效，总榜需重建
  await prisma.playerBestScore.deleteMany({ where: { board: "all" } });
}
