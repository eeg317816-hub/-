import { prisma } from "./db";

export async function getConfigMap() {
  const rows = await prisma.gameConfig.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.configKey] = r.configValue;
  return map;
}

export async function getConfigNumber(key: string, fallback: number) {
  const map = await getConfigMap();
  const n = Number(map[key]);
  return Number.isFinite(n) ? n : fallback;
}

export async function getConfigBool(key: string, fallback: boolean) {
  const map = await getConfigMap();
  if (!(key in map)) return fallback;
  return map[key] === "true" || map[key] === "1";
}

export async function setConfig(key: string, value: string, description?: string) {
  return prisma.gameConfig.upsert({
    where: { configKey: key },
    update: { configValue: value, ...(description ? { description } : {}) },
    create: { configKey: key, configValue: value, description },
  });
}
