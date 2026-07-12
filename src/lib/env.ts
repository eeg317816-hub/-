export type AppEnv = "development" | "test" | "production";

export function getAppEnv(): AppEnv {
  const v = (process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || "development").toLowerCase();
  if (v === "test" || v === "production" || v === "development") return v;
  return "development";
}

export function isDevCardInputEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_DEV_CARD_INPUT;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return getAppEnv() !== "production";
}

export function getIdleTtlSeconds(): number {
  const n = Number(process.env.SESSION_IDLE_TTL_SECONDS || 120);
  return Number.isFinite(n) && n > 0 ? n : 120;
}

/** 统一 API 根；同域部署留空，禁止生产写死 localhost */
export function getApiBaseUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (
    process.env.NODE_ENV === "production" &&
    /localhost|127\.0\.0\.1/.test(base)
  ) {
    console.error(
      "[env] NEXT_PUBLIC_API_BASE_URL 指向 localhost，生产环境请改为空（同域）或正式域名",
    );
  }
  return base;
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[env] 缺少必需环境变量: ${name}`);
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

export function assertRuntimeEnv() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.ADMIN_JWT_SECRET) missing.push("ADMIN_JWT_SECRET");
  if (missing.length) {
    console.error(`[env] 启动检查失败，缺少: ${missing.join(", ")}`);
  }
  return missing;
}
