import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }
  const cards = await prisma.card.findMany({ orderBy: { createdAt: "desc" } });
  return ok({
    cards: cards.map((c) => ({ ...c, id: Number(c.id) })),
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }
  const body = await req.json().catch(() => null);
  const cardCode = String(body?.cardCode || "").trim();
  if (!cardCode) return fail("缺少卡号");
  const card = await prisma.card.upsert({
    where: { cardCode },
    update: { status: body?.status || "active", note: body?.note },
    create: {
      cardCode,
      status: body?.status || "active",
      note: body?.note,
    },
  });
  return ok({ ...card, id: Number(card.id) });
}
