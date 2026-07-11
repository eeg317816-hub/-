import { NextResponse } from "next/server";

export function ok<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, ...data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

export function getClientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

/** 上海时区当日 00:00 / 23:59:59.999（转成 Date 供 Prisma 用） */
export function startOfDay(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = fmt.format(d); // YYYY-MM-DD
  // Asia/Shanghai = UTC+8
  return new Date(`${day}T00:00:00+08:00`);
}

export function endOfDay(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = fmt.format(d);
  return new Date(`${day}T23:59:59.999+08:00`);
}

export function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(/\//g, "-");
}
