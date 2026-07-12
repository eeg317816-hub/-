import { getApiBaseUrl } from "@/lib/env";

/** 统一拼装 API 地址，禁止业务代码写死 localhost */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}
