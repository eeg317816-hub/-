import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("???", 401);
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const phone = url.searchParams.get("phone") || "";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const take = Math.min(Number(url.searchParams.get("limit") || 100), 1000);
    const format = url.searchParams.get("format");

    const where: Prisma.GameSessionWhereInput = {};
    const and: Prisma.GameSessionWhereInput[] = [];

    if (phone) {
      and.push({ player: { phone: { contains: phone } } });
    }
    if (q) {
      and.push({
        OR: [
          { player: { phone: { contains: q } } },
          { player: { nickname: { contains: q } } },
          { deviceCode: { contains: q } },
        ],
      });
    }
    if (from) {
      and.push({ createdAt: { gte: new Date(`${from}T00:00:00+08:00`) } });
    }
    if (to) {
      and.push({ createdAt: { lte: new Date(`${to}T23:59:59.999+08:00`) } });
    }
    if (and.length) where.AND = and;

    const sessions = await prisma.gameSession.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: { player: true },
      orderBy: { createdAt: "desc" },
      take,
    });

    if (format === "csv") {
      const header = [
        "id", "player_id", "nickname", "phone", "mode", "score", "rank_level",
        "apm", "accuracy", "max_combo", "is_valid", "cheat_flag", "device_code", "created_at",
      ];
      const lines = [header.join(",")];
      for (const s of sessions) {
        lines.push([
          s.id, s.playerId, s.player.nickname, s.player.phone, s.mode, s.score,
          s.rankLevel, s.apm, s.accuracy, s.maxCombo, s.isValid, s.cheatFlag,
          s.deviceCode, s.createdAt.toISOString(),
        ].join(","));
      }
      return new Response(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="sessions.csv"',
        },
      });
    }

    return ok({
      sessions: sessions.map((s) => ({
        id: Number(s.id),
        playerId: Number(s.playerId),
        cardId: s.cardId == null ? null : Number(s.cardId),
        mode: s.mode,
        score: s.score,
        rankLevel: s.rankLevel,
        apm: s.apm,
        accuracy: Number(s.accuracy),
        maxCombo: s.maxCombo,
        isValid: s.isValid,
        cheatFlag: s.cheatFlag,
        deviceCode: s.deviceCode,
        createdAt: s.createdAt.toISOString(),
        player: {
          nickname: s.player.nickname,
          phone: s.player.phone,
        },
      })),
    });
  } catch (e) {
    console.error("[admin/sessions GET]", e);
    return fail("??????", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("???", 401);
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("?? id");
  await prisma.gameSession.delete({ where: { id: BigInt(id) } });
  return ok({ deleted: Number(id) });
}
