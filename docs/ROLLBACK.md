# 回滚说明

## 检查点一览

| 标签 | 含义 |
|------|------|
| `checkpoint-before-clear-transition` | 替换更清晰过场动画之前 |
| `checkpoint-after-bugfix-20260712` | **当前推荐**：修复 Router setState、后台配置、大屏仅结算后刷新、退出游戏之后 |

## 回滚到本次修复后的版本（最新稳定点）

```bash
git switch --detach checkpoint-after-bugfix-20260712
# 或拉分支继续开发：
git switch -c from-bugfix checkpoint-after-bugfix-20260712
```

## 回滚到更早的过场替换前基线

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
