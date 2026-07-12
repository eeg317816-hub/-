import { prisma } from "@/lib/db";
import { endOfDay, fail, ok, startOfDay, getClientIp } from "@/lib/api";
import { getConfigBool, getConfigNumber } from "@/lib/config";
import { getIdleTtlSeconds } from "@/lib/env";
import { expireStaleSessions } from "@/lib/terminal-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const playerId = Number(body?.playerId);
  const cardId = body?.cardId != null ? Number(body.cardId) : null;
  const terminalSessionId = Number(body?.terminalSessionId || 0);
  const deviceCode = String(body?.deviceCode || "PC01");
  const mode = String(body?.mode || "apm_challenge");

  if (!playerId) return fail("缺少 playerId");
  if (!terminalSessionId) return fail("缺少 terminalSessionId");

  if (!(await getConfigBool("activity_enabled", true))) {
    return fail("活动未开启", 403);
  }

  try {
    await expireStaleSessions();

    const durationSeconds = await getConfigNumber("default_duration_seconds", 30);
    const lifeCount = await getConfigNumber("life_count", 3);
    const dailyPlayLimit = await getConfigNumber("daily_play_limit", 3);

    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({ where: { id: BigInt(playerId) } });
      if (!player) throw new Error("PLAYER_NOT_FOUND");

      if (cardId != null && cardId > 0) {
        const card = await tx.card.findUnique({ where: { id: BigInt(cardId) } });
        if (!card || card.status !== "active") throw new Error("CARD_INVALID");
      }

      const term = await tx.terminalSession.findUnique({
        where: { id: BigInt(terminalSessionId) },
      });
      if (!term) throw new Error("TERM_NOT_FOUND");
      if (["EXPIRED", "ABORTED"].includes(term.status) || term.expiresAt < new Date()) {
        throw new Error("TERM_EXPIRED");
      }
      if (term.terminalCode !== deviceCode) throw new Error("TERM_MISMATCH");
      if (term.playerId && Number(term.playerId) !== playerId) {
        throw new Error("TERM_PLAYER_MISMATCH");
      }
      if (!["CREATED", "LOGIN", "READY"].includes(term.status)) {
        throw new Error("TERM_BAD_STATUS");
      }

      const playingOnTerminal = await tx.terminalSession.count({
        where: {
          terminalCode: deviceCode,
          status: "PLAYING",
          id: { not: term.id },
        },
      });
      if (playingOnTerminal > 0) throw new Error("TERMINAL_BUSY");

      const todayPlayCount = await tx.gameSession.count({
        where: {
          playerId: BigInt(playerId),
          createdAt: { gte: startOfDay(), lte: endOfDay() },
          status: { notIn: ["ABORTED", "EXPIRED"] },
        },
      });
      // 超次仍可练习，与既有产品逻辑一致
      const practiceOnly = todayPlayCount >= dailyPlayLimit;

      const now = new Date();
      const session = await tx.gameSession.create({
        data: {
          playerId: BigInt(playerId),
          cardId: cardId != null && cardId > 0 ? BigInt(cardId) : null,
          terminalSessionId: term.id,
          mode,
          status: "PLAYING",
          durationSeconds,
          lifeLeft: lifeCount,
          isValid: !practiceOnly,
          deviceCode,
          ipAddress: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
          startedAt: now,
        },
      });

      const playExpires = new Date(
        now.getTime() + (durationSeconds + 10) * 1000,
      );

      await tx.terminalSession.update({
        where: { id: term.id },
        data: {
          status: "PLAYING",
          playerId: BigInt(playerId),
          nickname: player.nickname,
          gameSessionId: session.id,
          lastHeartbeat: now,
          expiresAt: playExpires,
          updatedAt: now,
        },
      });

      return { session, practiceOnly, todayPlayCount };
    });

    return ok({
      sessionId: Number(result.session.id),
      durationSeconds,
      lifeCount,
      practiceOnly: result.practiceOnly,
      message: result.practiceOnly
        ? "今日正式次数已用尽，本局为练习局（不进榜）"
        : null,
      idleTtlHint: getIdleTtlSeconds(),
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "START_FAIL";
    console.error("[game/start]", code, err);
    const map: Record<string, [string, number]> = {
      PLAYER_NOT_FOUND: ["玩家不存在", 404],
      CARD_INVALID: ["卡片无效", 403],
      TERM_NOT_FOUND: ["终端会话不存在", 404],
      TERM_EXPIRED: ["会话已过期，请重新刷卡", 410],
      TERM_MISMATCH: ["终端不匹配", 403],
      TERM_PLAYER_MISMATCH: ["会话不属于当前用户", 403],
      TERM_BAD_STATUS: ["会话状态不可开局", 409],
      TERMINAL_BUSY: ["当前终端有进行中的对局", 409],
    };
    const [msg, status] = map[code] || ["开局失败", 500];
    return fail(msg, status);
  }
}
