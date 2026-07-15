import { prisma } from "@/lib/db";
import { getIdleTtlSeconds } from "@/lib/env";

const ACTIVE = ["CREATED", "LOGIN", "READY", "PLAYING", "SUBMITTING", "RESULT", "RANKING"];

export async function expireStaleSessions(now = new Date()) {
  await prisma.terminalSession.updateMany({
    where: {
      status: { in: ACTIVE },
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED", updatedAt: now },
  });
}

export async function openTerminalSession(terminalCode: string) {
  const now = new Date();
  await expireStaleSessions(now);

  await prisma.terminalSession.updateMany({
    where: {
      terminalCode,
      status: { in: ACTIVE },
    },
    data: { status: "EXPIRED", updatedAt: now },
  });

  const expiresAt = new Date(now.getTime() + getIdleTtlSeconds() * 1000);
  return prisma.terminalSession.create({
    data: {
      terminalCode,
      status: "LOGIN",
      startedAt: now,
      lastHeartbeat: now,
      expiresAt,
    },
  });
}

export async function touchHeartbeat(terminalSessionId: bigint) {
  const now = new Date();
  await expireStaleSessions(now);
  const row = await prisma.terminalSession.findUnique({
    where: { id: terminalSessionId },
  });
  if (!row) return { ok: false as const, expired: true };
  if (["EXPIRED", "ABORTED"].includes(row.status) || row.expiresAt < now) {
    if (row.status !== "EXPIRED") {
      await prisma.terminalSession.update({
        where: { id: row.id },
        data: { status: "EXPIRED", updatedAt: now },
      });
    }
    return { ok: false as const, expired: true };
  }
  // 滑动空闲窗口：每次心跳续期，避免对局/提交卡顿时被绝对 TTL 误踢
  const expiresAt = new Date(now.getTime() + getIdleTtlSeconds() * 1000);
  const updated = await prisma.terminalSession.update({
    where: { id: row.id },
    data: { lastHeartbeat: now, expiresAt, updatedAt: now },
  });
  return { ok: true as const, expired: false, session: updated };
}

export async function abortTerminal(terminalSessionId: bigint) {
  const now = new Date();
  const row = await prisma.terminalSession.findUnique({
    where: { id: terminalSessionId },
  });
  if (!row) return null;
  await prisma.$transaction(async (tx) => {
    await tx.terminalSession.update({
      where: { id: row.id },
      data: { status: "ABORTED", updatedAt: now },
    });
    if (row.gameSessionId) {
      await tx.gameSession.updateMany({
        where: {
          id: row.gameSessionId,
          status: { in: ["CREATED", "PLAYING"] },
        },
        data: { status: "ABORTED", endedAt: now },
      });
    }
    await tx.gameSession.updateMany({
      where: {
        deviceCode: row.terminalCode,
        status: { in: ["CREATED", "PLAYING"] },
        endedAt: null,
      },
      data: { status: "ABORTED", endedAt: now },
    });
  });
  return row;
}
