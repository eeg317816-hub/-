import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { formatDateTime, maskPhone } from "./api";
import { getConfigBool } from "./config";

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

function dateFilterSql(type: LeaderboardType) {
  return type === "today"
    ? Prisma.sql`AND (gs.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date = (NOW() AT TIME ZONE ${TZ})::date`
    : Prisma.empty;
}

async function validFilterSql() {
  const validOnly = await getConfigBool("leaderboard_valid_only", true);
  return validOnly
    ? Prisma.sql`AND gs.is_valid = TRUE AND gs.cheat_flag = FALSE`
    : Prisma.empty;
}

export async function getLeaderboardPage(params: {
  type: LeaderboardType;
  offset?: number;
  limit?: number;
  nickname?: string;
}) {
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(Math.max(1, params.limit ?? 20), 100);
  const dateFilter = dateFilterSql(params.type);
  const validFilter = await validFilterSql();

  const rows = await prisma.$queryRaw<
    Array<{
      player_id: bigint;
      nickname: string;
      phone: string;
      score: number;
      rank_level: string;
      rank_title: string;
      apm: number;
      accuracy: Prisma.Decimal | number;
      max_combo: number;
      created_at: Date;
      rn: bigint;
      total_count: bigint;
    }>
  >`
    WITH best AS (
      SELECT *
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
          gs.created_at,
          p.nickname,
          p.phone,
          ROW_NUMBER() OVER (
            PARTITION BY gs.player_id
            ORDER BY gs.score DESC, gs.accuracy DESC, gs.max_combo DESC, gs.error_count ASC, gs.created_at ASC
          ) AS player_best_rank
        FROM game_sessions gs
        JOIN players p ON p.id = gs.player_id
        WHERE 1=1
          ${validFilter}
          ${dateFilter}
      ) t
      WHERE t.player_best_rank = 1
    ),
    ranked AS (
      SELECT
        b.*,
        ROW_NUMBER() OVER (
          ORDER BY b.score DESC, b.accuracy DESC, b.max_combo DESC, b.error_count ASC, b.created_at ASC
        ) AS rn,
        COUNT(*) OVER () AS total_count
      FROM best b
    )
    SELECT
      player_id, nickname, phone, score, rank_level, rank_title,
      apm, accuracy, max_combo, created_at, rn, total_count
    FROM ranked
    ORDER BY rn ASC
    OFFSET ${offset}
    LIMIT ${limit}
  `;

  const list: LeaderboardRow[] = rows.map((r) => ({
    rank: Number(r.rn),
    playerId: Number(r.player_id),
    nickname: r.nickname,
    phoneMasked: maskPhone(r.phone),
    score: Number(r.score),
    rankLevel: r.rank_level,
    rankTitle: r.rank_title,
    apm: Number(r.apm),
    accuracy: Number(r.accuracy),
    maxCombo: Number(r.max_combo),
    createdAt: formatDateTime(new Date(r.created_at)),
  }));

  const total = rows[0] ? Number(rows[0].total_count) : 0;

  let myRank: LeaderboardRow | null = null;
  if (params.nickname) {
    const mine = await prisma.$queryRaw<
      Array<{
        player_id: bigint;
        nickname: string;
        phone: string;
        score: number;
        rank_level: string;
        rank_title: string;
        apm: number;
        accuracy: Prisma.Decimal | number;
        max_combo: number;
        created_at: Date;
        rn: bigint;
      }>
    >`
      WITH best AS (
        SELECT *
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
            gs.created_at,
            p.nickname,
            p.phone,
            ROW_NUMBER() OVER (
              PARTITION BY gs.player_id
              ORDER BY gs.score DESC, gs.accuracy DESC, gs.max_combo DESC, gs.error_count ASC, gs.created_at ASC
            ) AS player_best_rank
          FROM game_sessions gs
          JOIN players p ON p.id = gs.player_id
          WHERE 1=1
            ${validFilter}
            ${dateFilter}
        ) t
        WHERE t.player_best_rank = 1
      ),
      ranked AS (
        SELECT
          b.*,
          ROW_NUMBER() OVER (
            ORDER BY b.score DESC, b.accuracy DESC, b.max_combo DESC, b.error_count ASC, b.created_at ASC
          ) AS rn
        FROM best b
      )
      SELECT
        player_id, nickname, phone, score, rank_level, rank_title,
        apm, accuracy, max_combo, created_at, rn
      FROM ranked
      WHERE nickname = ${params.nickname}
      LIMIT 1
    `;
    if (mine[0]) {
      const r = mine[0];
      myRank = {
        rank: Number(r.rn),
        playerId: Number(r.player_id),
        nickname: r.nickname,
        phoneMasked: maskPhone(r.phone),
        score: Number(r.score),
        rankLevel: r.rank_level,
        rankTitle: r.rank_title,
        apm: Number(r.apm),
        accuracy: Number(r.accuracy),
        maxCombo: Number(r.max_combo),
        createdAt: formatDateTime(new Date(r.created_at)),
      };
    }
  }

  const top = await prisma.$queryRaw<
    Array<{ player_id: bigint; score: number; rn: bigint }>
  >`
    WITH best AS (
      SELECT *
      FROM (
        SELECT
          gs.player_id,
          gs.score,
          gs.accuracy,
          gs.max_combo,
          gs.error_count,
          gs.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY gs.player_id
            ORDER BY gs.score DESC, gs.accuracy DESC, gs.max_combo DESC, gs.error_count ASC, gs.created_at ASC
          ) AS player_best_rank
        FROM game_sessions gs
        WHERE 1=1
          ${validFilter}
          ${dateFilter}
      ) t
      WHERE t.player_best_rank = 1
    ),
    ranked AS (
      SELECT
        player_id,
        score,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, accuracy DESC, max_combo DESC, error_count ASC, created_at ASC
        ) AS rn
      FROM best
    )
    SELECT player_id, score, rn FROM ranked WHERE rn <= 20 ORDER BY rn
  `;
  const version = top.map((t) => `${t.rn}:${t.player_id}:${t.score}`).join("|");

  return {
    list,
    total,
    offset,
    limit,
    hasMore: offset + list.length < total,
    myRank,
    version,
    updatedAt: Date.now(),
  };
}

export async function getLeaderboard(type: LeaderboardType, limit = 100) {
  const page = await getLeaderboardPage({ type, offset: 0, limit });
  return page.list;
}

export async function getTodayRank(playerId: bigint) {
  const rows = await prisma.$queryRaw<Array<{ rn: bigint }>>`
    SELECT rn FROM (
      SELECT
        player_id,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, accuracy DESC, max_combo DESC, error_count ASC, created_at ASC
        ) AS rn
      FROM (
        SELECT
          gs.player_id,
          gs.score,
          gs.accuracy,
          gs.max_combo,
          gs.error_count,
          gs.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY gs.player_id
            ORDER BY gs.score DESC, gs.accuracy DESC, gs.max_combo DESC, gs.error_count ASC, gs.created_at ASC
          ) AS player_best_rank
        FROM game_sessions gs
        WHERE gs.is_valid = TRUE
          AND gs.cheat_flag = FALSE
          AND (gs.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${TZ})::date
              = (NOW() AT TIME ZONE ${TZ})::date
      ) x
      WHERE x.player_best_rank = 1
    ) y
    WHERE y.player_id = ${playerId}
  `;
  return rows[0] ? Number(rows[0].rn) : null;
}

export async function getPlayerBestScore(playerId: bigint) {
  const row = await prisma.gameSession.findFirst({
    where: { playerId, isValid: true, cheatFlag: false },
    orderBy: [
      { score: "desc" },
      { accuracy: "desc" },
      { maxCombo: "desc" },
      { errorCount: "asc" },
      { createdAt: "asc" },
    ],
  });
  return row?.score ?? 0;
}
