import { prisma } from "@/lib/db";
import { fail, ok, startOfDay, endOfDay } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }
  const body = await req.json().catch(() => ({}));
  const type = body.type as "today" | "all";

  if (type === "today") {
    const r = await prisma.gameSession.updateMany({
      where: { createdAt: { gte: startOfDay(), lte: endOfDay() } },
      data: { isValid: false },
    });
    return ok({ invalidated: r.count });
  }

  const r = await prisma.gameSession.updateMany({
    data: { isValid: false },
  });
  return ok({ invalidated: r.count });
}
