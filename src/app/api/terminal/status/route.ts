import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getIdleTtlSeconds } from "@/lib/env";
import { expireStaleSessions } from "@/lib/terminal-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.terminalSessionId);
  const status = String(body?.status || "").trim();
  const allowed = [
    "LOGIN",
    "READY",
    "PLAYING",
    "SUBMITTING",
    "RESULT",
    "RANKING",
  ];
  if (!id) return fail("缺少 terminalSessionId");
  if (!allowed.includes(status)) return fail("非法状态");

  await expireStaleSessions();
  const row = await prisma.terminalSession.findUnique({ where: { id: BigInt(id) } });
  if (!row || ["EXPIRED", "ABORTED"].includes(row.status)) {
    return fail("会话已失效", 410);
  }

  const now = new Date();
  let expiresAt = row.expiresAt;
  if (status === "READY" || status === "LOGIN") {
    expiresAt = new Date(now.getTime() + getIdleTtlSeconds() * 1000);
  }
  // PLAYING 的 expiresAt 由 start 游戏时写入 duration+10s

  const updated = await prisma.terminalSession.update({
    where: { id: row.id },
    data: { status, expiresAt, lastHeartbeat: now, updatedAt: now },
  });

  return ok({
    terminalSessionId: Number(updated.id),
    status: updated.status,
    expiresAt: updated.expiresAt.toISOString(),
  });
}
