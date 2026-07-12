# 全职高手 · 测手速

展会 PC Web 手速挑战（Next.js + PostgreSQL）。

## 快速开始（本地）

```bash
cp .env.example .env.local   # 填写 DATABASE_URL 等
npm install
npm run db:push
ADMIN_SEED_PASSWORD=your-password npm run db:seed
npm run dev
```

- 玩家端：http://localhost:3000
- 大屏榜：http://localhost:3000/leaderboard-for-big-screen
- 后台：http://localhost:3000/admin
- 健康检查：http://localhost:3000/api/health

## 文档

- [部署手册（三环境）](docs/DEPLOYMENT.md)
- [回滚说明](docs/ROLLBACK.md)
- [PRD / 技术实现](docs/PRD-技术实现文档.md)

## 环境

| 环境 | APP_ENV | 说明 |
|------|---------|------|
| 本地开发 | development | 手工输入卡号 + 楔形键盘 |
| 云测试 | test | 阿里云独立库，可免实体卡 |
| 现场正式 | production | 局域网主机，仅读卡器刷卡 |
