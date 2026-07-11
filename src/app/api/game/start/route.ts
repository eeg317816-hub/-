import { prisma } from "@/lib/db";
import { endOfDay, fail, ok, startOfDay, getClientIp } from "@/lib/api";
import { getConfigBool, getConfigNumber } from "@/lib/config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const playerId = Number(body?.playerId);
  const cardId = body?.cardId != null ? Number(body.cardId) : null;
  const deviceCode = String(body?.deviceCode || "PC01");
  const mode = String(body?.mode || "apm_challenge");

  if (!playerId) return fail("缺少 playerId");

  if (!(await getConfigBool("activity_enabled", true))) {
    return fail("活动未开启", 403);
  }

  const player = await prisma.player.findUnique({ where: { id: BigInt(playerId) } });
  if (!player) return fail("玩家不存在", 404);

  if (cardId != null) {
    const card = await prisma.card.findUnique({ where: { id: BigInt(cardId) } });
    if (!card || card.status !== "active") return fail("卡片无效", 403);
  }

  const durationSeconds = await getConfigNumber("default_duration_seconds", 30);
  const lifeCount = await getConfigNumber("life_count", 3);
  const dailyPlayLimit = await getConfigNumber("daily_play_limit", 3);
  const todayPlayCount = await prisma.gameSession.count({
    where: {
      playerId: BigInt(playerId),
      createdAt: { gte: startOfDay(), lte: endOfDay() },
    },
  });
  const practiceOnly = todayPlayCount >= dailyPlayLimit;

  const session = await prisma.gameSession.create({
    data: {
      playerId: BigInt(playerId),
      cardId: cardId != null ? BigInt(cardId) : null,
      mode,
      durationSeconds,
      lifeLeft: lifeCount,
      isValid: !practiceOnly,
      deviceCode,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      startedAt: new Date(),
    },
  });

  return ok({
    sessionId: Number(session.id),
    durationSeconds,
    lifeCount,
    practiceOnly,
    message: practiceOnly ? "今日正式次数已用尽，本局为练习局（不进榜）" : null,
  });
}
