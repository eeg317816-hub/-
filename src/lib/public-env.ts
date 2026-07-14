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

/** 测试环境：点击模拟插卡（替代手工输入框） */
export function enableCardTapSim(): boolean {
  return enableDevCardInput();
}

export function heartbeatIntervalMs(): number {
  const n = Number(process.env.NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS || 20000);
  return Number.isFinite(n) && n >= 5000 ? n : 20000;
}

export function publicApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

/** 浏览器内始终用相对路径，避免 Zeabur 误配 NEXT_PUBLIC_API_BASE_URL 导致 fetch 失败 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") return p;
  const base = publicApiBase();
  return base ? `${base}${p}` : p;
}
