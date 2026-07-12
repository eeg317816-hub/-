export type AppEnv = "development" | "test" | "production";

export function getPublicAppEnv(): AppEnv {
  const v = (process.env.NEXT_PUBLIC_APP_ENV || "development").toLowerCase();
  if (v === "test" || v === "production" || v === "development") return v;
  return "development";
}

export function enableDevCardInput(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_DEV_CARD_INPUT;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return getPublicAppEnv() !== "production";
}

export function heartbeatIntervalMs(): number {
  const n = Number(process.env.NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS || 20000);
  return Number.isFinite(n) && n >= 5000 ? n : 20000;
}

export function publicApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const base = publicApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
