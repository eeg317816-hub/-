import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getConfigBool } from "@/lib/config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cardCode = String(body?.cardCode || "").trim();
  const deviceCode = String(body?.deviceCode || "PC01");

  if (!cardCode) return fail("缺少卡号");

  const activityEnabled = await getConfigBool("activity_enabled", true);
  if (!activityEnabled) return fail("活动未开启", 403);

  let card = await prisma.card.findUnique({ where: { cardCode } });
  const bypass = process.env.CARD_BYPASS;
  if (!card && bypass && cardCode === bypass) {
    card = await prisma.card.create({
      data: { cardCode, status: "active", note: "bypass" },
    });
  }

  if (!card || card.status !== "active") {
    return fail("无效卡或无权限", 403);
  }

  return ok({
    cardId: Number(card.id),
    needUserInfo: true,
    deviceCode,
  });
}
