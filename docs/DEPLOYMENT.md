# 全职高手测手速 · 部署手册

同一套代码，三套独立环境，**各用独立数据库**，测试数据不得进入现场正式库。

| 环境 | `APP_ENV` / `NEXT_PUBLIC_APP_ENV` | 典型部署 | 域名示意 | 刷卡 |
|------|-----------------------------------|----------|----------|------|
| 本地开发 | `development` | 开发机 `npm run dev` | `http://localhost:3000` | 手工输入 + 楔形键盘均可 |
| 云测试 | `test` | 阿里云 ECS / 容器 | `https://apm-test.example.com` | 手工输入开启（可免实体卡） |
| 现场正式 | `production` | 展会主机局域网 | `http://apm.local` 或 `http://192.168.x.x:3000` | 仅实体读卡器（键盘楔入） |

路由目录（所有环境相同）：

| 路径 | 说明 |
|------|------|
| `/` | 等待刷卡 `WAITING_CARD` |
| `/login` | 选手登记 |
| `/modes` | 准备开局 |
| `/game` | 对局 |
| `/result` | 结算 |
| `/leaderboard` | 玩家排行榜 |
| `/leaderboard-for-big-screen` | 大屏总榜 |
| `/admin` | 运营后台（含终端管理） |
| `/api/health` | 健康检查 |

终端编号：游戏电脑用 `?device=terminal-01`（或 `deviceCode` / `terminal`）打开页面，会写入本机 `localStorage`。

---

## 1. 工程判定

- **Next.js 15 App Router 前后端一体**（`src/app` + Route Handlers）
- 数据库：**PostgreSQL**（Prisma ORM）
- 默认端口：**3000**
- 监听：`0.0.0.0`（方便局域网 5 台电脑访问）

### 初始化命令

```bash
# 创建库（示例名）
createdb qzgs_apm_game_dev    # 开发
createdb qzgs_apm_game_test   # 测试
createdb qzgs_apm_game_prod   # 正式

cp .env.example .env.local    # 按环境填写
npm install
npm run db:generate
npm run db:push               # 或 npm run db:migrate
ADMIN_SEED_PASSWORD='你的强密码' npm run db:seed
```

### 环境变量清单（见 `.env.example`）

| 变量 | 用途 |
|------|------|
| `APP_ENV` / `NEXT_PUBLIC_APP_ENV` | development / test / production |
| `DATABASE_URL` | Postgres 连接串（**每环境独立**） |
| `PORT` / `HOSTNAME` | 服务端口与绑定地址 |
| `NEXT_PUBLIC_API_BASE_URL` | API 根；**同域部署留空**，禁止生产写死 localhost |
| `NEXT_PUBLIC_SITE_URL` | 站点对外 URL |
| `ADMIN_JWT_SECRET` | 后台 JWT 密钥 |
| `ADMIN_SEED_USERNAME` / `ADMIN_SEED_PASSWORD` | 仅 seed 用，勿写死业务代码 |
| `NEXT_PUBLIC_ENABLE_DEV_CARD_INPUT` | 是否显示手工卡号输入 |
| `SESSION_IDLE_TTL_SECONDS` | 登录后未开局过期秒数（默认 120） |
| `NEXT_PUBLIC_HEARTBEAT_INTERVAL_MS` | 心跳间隔（默认 20000） |
| `NEXT_PUBLIC_GAME_ID` | 活动标识 |

---

## 2. 主机部署（现场 production）

建议：一台主机跑 Node + Postgres；5 台游戏电脑浏览器全屏打开  
`http://<主机IP>:3000/?device=terminal-0N`  
大屏：`http://<主机IP>:3000/leaderboard-for-big-screen`  
后台：`http://<主机IP>:3000/admin`

```bash
# 1) 安装 Node 20+、Postgres 14+
# 2) 配置 .env.production（参考 .env.production.example）
#    NEXT_PUBLIC_ENABLE_DEV_CARD_INPUT=false
# 3) 构建与启动
export $(grep -v '^#' .env.production | xargs)   # 或使用 systemd EnvironmentFile
npm ci
npm run db:push
ADMIN_SEED_PASSWORD='...' npm run db:seed
npm run build
npm run start
```

### systemd 示例 `/etc/systemd/system/qzgs-apm.service`

```ini
[Unit]
Description=QZGS APM Game
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/qzgs-apm
EnvironmentFile=/opt/qzgs-apm/.env.production
ExecStart=/usr/bin/npm run start
Restart=on-failure
User=qzgs

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now qzgs-apm
sudo systemctl status qzgs-apm
journalctl -u qzgs-apm -f
```

读卡器：USB 楔形键盘；仅 `WAITING_CARD` 监听；刷卡字符串不上报、不落库。

防火墙放行 TCP 3000（或前置 Nginx 反代 80）。

---

## 3. 云服务器部署（test · 阿里云）

1. 安全组放行 80/443（及调试用 3000）
2. 独立库 `qzgs_apm_game_test`
3. `NEXT_PUBLIC_ENABLE_DEV_CARD_INPUT=true` 方便远程免实体卡
4. 域名如 `apm-test.example.com` → Nginx/Caddy → `127.0.0.1:3000`
5. 可选：Cloudflare 仅作 DNS / CDN / Tunnel 前置；**Node + Prisma 仍跑在阿里云主机**（不建议把本项目直接塞进 Cloudflare Workers）

```bash
git pull
npm ci
npm run build:test
# 停旧起新
pm2 restart qzgs-apm-test || pm2 start npm --name qzgs-apm-test -- start
curl -sf https://apm-test.example.com/api/health
```

---

## 4. 本地开发（development）

```bash
cp .env.development .env.local   # 或合并进 .env
createdb qzgs_apm_game_dev
npm install
npm run db:push
ADMIN_SEED_PASSWORD=admin123 npm run db:seed
npm run dev
open http://localhost:3000
```

---

## 5. 启动 / 停止 / 日志 / 健康检查

```bash
npm run start          # 生产模式
npm run health         # GET /api/health
# 期望：{"status":"ok","database":"connected","timestamp":"..."}
```

日志：

- 前台：进程 stdout
- systemd：`journalctl -u qzgs-apm -f`
- pm2：`pm2 logs qzgs-apm-test`

常见错误日志关键字：

- `[env] 缺少必需环境变量`
- `[health] 数据库连接失败`
- `Error: listen EADDRINUSE` → 端口占用，改 `PORT` 或杀掉占用进程

---

## 6. 更新版本

```bash
git fetch && git checkout <tag或分支>
npm ci
npm run db:push          # 有 schema 变更时
npm run build
# 重启服务（systemctl / pm2）
```

---

## 7. 回滚版本

见 `docs/ROLLBACK.md`。示例：

```bash
git switch --detach checkpoint-nickname-board-layout-20260712
npm ci && npm run build && systemctl restart qzgs-apm
```

数据库回滚需另行备份/恢复；代码回滚不会自动恢复已删数据。

---

## 8. 终端状态与刷卡（摘要）

`WAITING_CARD` 才响应刷卡；其余页面不挂载扫描监听，避免干扰对局按键。  
登录后未开局约 2 分钟过期；开局后为「局时 + 10s」。  
心跳 15–30s 更新 `last_heartbeat`，**不无限延长** `expires_at`。  
后台「终端管理」可强制释放（会话 → `ABORTED`）。
