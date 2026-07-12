import { prisma } from "@/lib/db";
import { endOfDay, fail, ok, startOfDay } from "@/lib/api";
import { getConfigNumber } from "@/lib/config";
import { getIdleTtlSeconds } from "@/lib/env";
import { NICKNAME_HINT, validateNickname } from "@/lib/nickname";
import { expireStaleSessions } from "@/lib/terminal-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone || "").trim();
  const nickname = String(body?.nickname || "").trim();
  const deviceCode = String(body?.deviceCode || "PC01");
  const terminalSessionId = Number(body?.terminalSessionId || 0);
  const cardId = body?.cardId != null ? Number(body.cardId) : 0;

  if (!/^1\d{10}$/.test(phone)) return fail("请输入有效的11位手机号");
  const nickErr = validateNickname(nickname);
  if (nickErr) return fail(nickErr || NICKNAME_HINT);
  if (!terminalSessionId) return fail("缺少终端会话，请重新刷卡");

  try {
    await expireStaleSessions();

    const term = await prisma.terminalSession.findUnique({
      where: { id: BigInt(terminalSessionId) },
    });
    if (!term || ["EXPIRED", "ABORTED"].includes(term.status) || term.expiresAt < new Date()) {
      return fail("会话已过期，请重新刷卡", 410);
    }
    if (term.terminalCode !== deviceCode) {
      return fail("终端不匹配", 403);
    }

    if (cardId > 0) {
      const card = await prisma.card.findUnique({ where: { id: BigInt(cardId) } });
      if (!card || card.status !== "active") return fail("卡片无效", 403);
    }

    const byPhone = await prisma.player.findUnique({ where: { phone } });
    const byNick = await prisma.player.findUnique({ where: { nickname } });

    let player = byPhone;
    if (byPhone) {
      if (byPhone.nickname !== nickname) {
        return fail("手机号与昵称不匹配", 400, { code: "PHONE_NICK_MISMATCH" });
      }
      player = await prisma.player.update({
        where: { id: byPhone.id },
        data: { lastLoginAt: new Date(), updatedAt: new Date() },
      });
    } else {
      if (byNick) {
        return fail("该昵称已占用，请使用别的昵称", 409, { code: "NICKNAME_TAKEN" });
      }
      player = await prisma.player.create({
        data: { phone, nickname, lastLoginAt: new Date() },
      });
    }

    const now = new Date();
    await prisma.terminalSession.update({
      where: { id: term.id },
      data: {
        status: "READY",
        playerId: player.id,
        nickname: player.nickname,
        lastHeartbeat: now,
        expiresAt: new Date(now.getTime() + getIdleTtlSeconds() * 1000),
        updatedAt: now,
      },
    });

    const dailyPlayLimit = await getConfigNumber("daily_play_limit", 3);
    const todayPlayCount = await prisma.gameSession.count({
      where: {
        playerId: player.id,
        createdAt: { gte: startOfDay(), lte: endOfDay() },
        status: { notIn: ["ABORTED", "EXPIRED"] },
      },
    });

    return ok({
      playerId: Number(player.id),
      todayPlayCount,
      dailyPlayLimit,
      canPlay: true,
      practiceOnly: todayPlayCount >= dailyPlayLimit,
      deviceCode,
      nickname: player.nickname,
      phone: player.phone,
      terminalSessionId: Number(term.id),
    });
  } catch (err) {
    console.error("[player/register]", err);
    return fail("登录失败", 500);
  }
}
