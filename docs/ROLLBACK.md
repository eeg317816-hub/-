# 回滚说明

## 检查点一览

| 标签 | 含义 |
|------|------|
| `checkpoint-before-clear-transition` | 替换更清晰过场动画之前 |
| `checkpoint-after-bugfix-20260712` | 修复 Router setState、后台配置、大屏仅结算后刷新、退出游戏之后 |
| `checkpoint-nickname-board-layout-20260712` | 昵称 2–10 规则、排行榜列排版、登记页退出、超长昵称清库 |
| `checkpoint-hud-env-terminal-20260713` | **当前推荐**：HUD UI、三环境部署、刷卡状态机、终端会话/心跳/强制释放 |

## 回滚到本次修改后的版本（最新稳定点）

```bash
git switch --detach checkpoint-hud-env-terminal-20260713
# 或拉分支继续开发：
git switch -c from-nickname-layout checkpoint-nickname-board-layout-20260712
```

## 回滚到更早的 bugfix 点

```bash
git switch --detach checkpoint-after-bugfix-20260712
```

## 回滚到过场替换前基线

```bash
git switch --detach checkpoint-before-clear-transition
```

## 回到最新 main

```bash
git switch main
```

## 仅恢复旧过场视频

```bash
cp public/media/archive/card-transition-2026-07-12-prev.mp4 public/media/card-transition.mp4
```

## 备注

- `.env` 未入库
- 回滚后执行 `npm install`
- 若回滚到昵称规则之前的代码，数据库里被清空的超长昵称用户不会自动恢复
