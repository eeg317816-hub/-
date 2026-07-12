import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { abortTerminal, expireStaleSessions } from "@/lib/terminal-server";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }

  await expireStaleSessions();
  const rows = await prisma.terminalSession.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    include: { player: { select: { nickname: true, phone: true } } },
  });

  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!latest.has(r.terminalCode)) latest.set(r.terminalCode, r);
  }

  return ok({
    terminals: Array.from(latest.values()).map((r) => ({
      id: Number(r.id),
      terminalCode: r.terminalCode,
      status: r.status,
      nickname: r.nickname || r.player?.nickname || null,
      phone: r.player?.phone || null,
      startedAt: r.startedAt.toISOString(),
      lastHeartbeat: r.lastHeartbeat.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      gameSessionId: r.gameSessionId ? Number(r.gameSessionId) : null,
    })),
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  const id = Number(body?.terminalSessionId);

  if (action !== "force_release") return fail("未知操作");
  if (!id) return fail("缺少 terminalSessionId");

  const row = await abortTerminal(BigInt(id));
  if (!row) return fail("终端会话不存在", 404);
  return ok({ released: true, terminalCode: row.terminalCode });
}
