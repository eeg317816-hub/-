import { prisma } from "@/lib/db";
import { endOfDay, fail, ok, startOfDay } from "@/lib/api";
import { getConfigNumber } from "@/lib/config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cardId = Number(body?.cardId);
  const phone = String(body?.phone || "").trim();
  const nickname = String(body?.nickname || "").trim();
  const deviceCode = String(body?.deviceCode || "PC01");

  if (!cardId) return fail("缺少 cardId");
  if (!/^1\d{10}$/.test(phone)) return fail("请输入有效的11位手机号");
  if (!nickname || nickname.length < 2 || nickname.length > 50) {
    return fail("昵称长度需为 2–50 个字符");
  }

  const card = await prisma.card.findUnique({ where: { id: BigInt(cardId) } });
  if (!card || card.status !== "active") return fail("卡片无效", 403);

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
      data: {
        phone,
        nickname,
        lastLoginAt: new Date(),
      },
    });
  }

  const dailyPlayLimit = await getConfigNumber("daily_play_limit", 3);
  const todayPlayCount = await prisma.gameSession.count({
    where: {
      playerId: player.id,
      createdAt: { gte: startOfDay(), lte: endOfDay() },
    },
  });

  return ok({
    playerId: Number(player.id),
    todayPlayCount,
    dailyPlayLimit,
    canPlay: true, // 超次仍可练习
    practiceOnly: todayPlayCount >= dailyPlayLimit,
    deviceCode,
    nickname: player.nickname,
    phone: player.phone,
  });
}
