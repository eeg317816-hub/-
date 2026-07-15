# 最简单部署（只走 Zeabur）

阿里云 / Railway 步骤多、容易配错。本项目已提供 `Dockerfile`，**优先用 Zeabur**。

## 0. 代码已准备好

仓库根目录已有：

- `Dockerfile`
- `scripts/start-cloud.sh`（启动时自动 `db push` + seed）
- `next.config.ts` → `output: "standalone"`

先确认 GitHub 是最新代码。

## 1. Zeabur 新建项目

1. 打开 [Zeabur](https://zeabur.com) 登录
2. **Create Project** → 名字填 `qzgsapm`（**不要**用 `-`）
3. **Add Service** → **Git** → 选仓库 `eeg317816-hub/-`（或你改名后的仓库）
4. 部署方式会用仓库里的 **Dockerfile**（不要选手动 Node 无 Dockerfile 模式）

## 2. 加数据库

1. 同一项目里 **Add Service** → **PostgreSQL**
2. 等 Postgres 启动成功

## 3. 给「网站服务」填变量

点 **网站 / Next 那个服务** → Variables，添加：

| 变量 | 值 |
|------|-----|
| `DATABASE_URL` | 用「引用 / Reference」选 Postgres 的连接串 |
| `ADMIN_JWT_SECRET` | 随便一长串，如 `qzgs-zeabur-jwt-lespaul09` |
| `ADMIN_SEED_USERNAME` | `admin` |
| `ADMIN_SEED_PASSWORD` | `admin123`（各环境统一） |
| `APP_ENV` | `test` |
| `NEXT_PUBLIC_APP_ENV` | `test` |
| `NEXT_PUBLIC_ENABLE_DEV_CARD_INPUT` | `true` |
| `NEXT_PUBLIC_API_BASE_URL` | 留空 |
| `NEXT_PUBLIC_SITE_URL` | 部署成功后的域名（可先空，稍后再改） |
| `NEXT_PUBLIC_GAME_ID` | `qzgs-apm-2026` |
| `SESSION_IDLE_TTL_SECONDS` | `120` |

保存后 **Redeploy**。

## 4. 验证

打开域名：

- `/` 刷卡页
- `/api/health` 应显示 `"database":"connected"`
- `/admin` 用 `admin` + 你设的密码登录
- `/leaderboard-for-big-screen` 大屏榜

## 5. 常见失败

| 现象 | 处理 |
|------|------|
| 服务名 `-` 报错 | 改名 `qzgsapm` |
| 要 Dockerfile | 已提供，重新拉取最新 commit |
| 缺 DATABASE_URL | Variables 里引用 Postgres |
| 构建失败 Node 版本 | Dockerfile 固定 Node 20，勿选手动 Node 7 |

## 不要做的事

- 不要用阿里云 ECS 手敲（实例、安全组、Git、Node 版本都容易错）
- 不要在本机 `~` 目录跑 `prisma`，要进项目目录
- 不要把本机 `.env` 指望会自动进云端
