import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const configs: Array<{ key: string; value: string; description: string }> = [
  { key: "daily_play_limit", value: "3", description: "同一手机号每天可挑战次数" },
  { key: "default_duration_seconds", value: "30", description: "默认游戏时长" },
  { key: "life_count", value: "3", description: "默认生命值" },
  { key: "activity_enabled", value: "true", description: "活动是否开启" },
  { key: "leaderboard_valid_only", value: "true", description: "排行榜是否只展示有效成绩" },
];

async function main() {
  const username = process.env.ADMIN_SEED_USERNAME || "admin";
  // 各环境统一默认；Zeabur 请将 ADMIN_SEED_PASSWORD 设为 admin123
  const password = process.env.ADMIN_SEED_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash, status: "active", role: "super_admin" },
    create: {
      username,
      passwordHash,
      role: "super_admin",
      status: "active",
    },
  });

  await prisma.card.upsert({
    where: { cardCode: "DEV-CARD-001" },
    update: { status: "active", note: "开发测试卡（仅手工调试入口用）" },
    create: { cardCode: "DEV-CARD-001", status: "active", note: "开发测试卡" },
  });

  for (const c of configs) {
    await prisma.gameConfig.upsert({
      where: { configKey: c.key },
      update: { configValue: c.value, description: c.description },
      create: {
        configKey: c.key,
        configValue: c.value,
        description: c.description,
      },
    });
  }

  console.log(`Seed OK: admin user=${username}, card DEV-CARD-001, game_config`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
