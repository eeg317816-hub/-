import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import {
  computeFromEvents,
  computeFromSummary,
  type GameEvent,
} from "@/lib/scoring";
import { getPlayerBestScore, getTodayRank } from "@/lib/leaderboard";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sessionId = Number(body?.sessionId);
  const playerId = Number(body?.playerId);

  if (!sessionId || !playerId) return fail("缺少 sessionId 或 playerId");

  const session = await prisma.gameSession.findUnique({
    where: { id: BigInt(sessionId) },
  });
  if (!session) return fail("对局不存在", 404);
  if (Number(session.playerId) !== playerId) return fail("玩家与对局不匹配", 403);
  if (session.endedAt) return fail("成绩已提交，请勿重复");

  const events = Array.isArray(body.events) ? (body.events as GameEvent[]) : [];

  let metrics =
    events.length > 0
      ? computeFromEvents({
          events,
          durationSeconds: session.durationSeconds,
          maxApmHint: Number(body.maxApm || body.apm || 0),
        })
      : computeFromSummary({
          correctCount: Number(body.correctCount || 0),
          errorCount: Number(body.errorCount || 0),
          maxCombo: Number(body.maxCombo || 0),
          avgReactionMs: body.avgReactionMs == null ? 0 : Number(body.avgReactionMs),
          apm: Number(body.apm || 0),
          maxApm: Number(body.maxApm || body.apm || 0),
          mouseCorrect: Number(body.mouseCorrect || 0),
          mouseError: Number(body.mouseError || 0),
          keyboardCorrect: Number(body.keyboardCorrect || 0),
          keyboardError: Number(body.keyboardError || 0),
          claimedScore:
            body.score == null ? undefined : Number(body.score),
        });

  // 设备短时限流
  const recent = await prisma.gameSession.count({
    where: {
      deviceCode: session.deviceCode || undefined,
      endedAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recent >= 8) {
    metrics = {
      ...metrics,
      cheatFlag: true,
      cheatReason: [metrics.cheatReason, "同设备提交过于频繁"]
        .filter(Boolean)
        .join("；"),
    };
  }

  const isValid = session.isValid && !metrics.cheatFlag;

  const updated = await prisma.gameSession.update({
    where: { id: session.id },
    data: {
      status: "ENDED",
      score: metrics.score,
      rankLevel: metrics.rankLevel,
      rankTitle: metrics.rankTitle,
      apm: metrics.apm,
      maxApm: metrics.maxApm,
      accuracy: new Prisma.Decimal(metrics.accuracy.toFixed(2)),
      correctCount: metrics.correctCount,
      errorCount: metrics.errorCount,
      mouseCorrect: metrics.mouseCorrect,
      mouseError: metrics.mouseError,
      keyboardCorrect: metrics.keyboardCorrect,
      keyboardError: metrics.keyboardError,
      maxCombo: metrics.maxCombo,
      avgReactionMs: metrics.avgReactionMs,
      lifeLeft: Number(body.lifeLeft ?? 0),
      isValid,
      cheatFlag: metrics.cheatFlag,
      cheatReason: metrics.cheatReason,
      endedAt: new Date(),
    },
  });

  const todayRank = isValid ? await getTodayRank(updated.playerId) : null;
  const bestScore = await getPlayerBestScore(updated.playerId);

  
  if (session.terminalSessionId) {
    await prisma.terminalSession.updateMany({
      where: { id: session.terminalSessionId },
      data: {
        status: "RESULT",
        lastHeartbeat: new Date(),
        updatedAt: new Date(),
      },
    });
  } else if (session.deviceCode) {
    await prisma.terminalSession.updateMany({
      where: {
        terminalCode: session.deviceCode,
        status: "PLAYING",
      },
      data: { status: "RESULT", lastHeartbeat: new Date(), updatedAt: new Date() },
    });
  }

  return ok({
    score: updated.score,
    rankLevel: updated.rankLevel,
    rankTitle: updated.rankTitle,
    comment: metrics.comment,
    todayRank,
    bestScore: Math.max(bestScore, updated.score),
    isValid: updated.isValid,
    cheatFlag: updated.cheatFlag,
    cheatReason: updated.cheatReason,
    apm: updated.apm,
    accuracy: Number(updated.accuracy),
    maxCombo: updated.maxCombo,
  });
}
