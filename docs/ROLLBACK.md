# 回滚说明

本仓库已用 Git 建立检查点，可随时回到「替换更清晰过场动画之前」的完整工程。

## 当前检查点

| 名称 | 含义 |
|------|------|
| 标签 `checkpoint-before-clear-transition` | 替换清晰过场动画前的完整代码与资源 |
| 分支提交（该标签指向的 commit） | 同上 |

## 如何回滚到该检查点

在项目根目录执行：

```bash
# 查看标签
git tag -l

# 方式 A：临时查看/运行该版本（不改当前分支）
git switch --detach checkpoint-before-clear-transition

# 方式 B：把当前分支硬回退到检查点（会丢弃之后未提交改动，慎用）
git switch main 2>/dev/null || git switch master 2>/dev/null || true
git reset --hard checkpoint-before-clear-transition

# 方式 C：新建分支从检查点继续改
git switch -c restore-from-checkpoint checkpoint-before-clear-transition
```

回到最新代码：

```bash
git switch master   # 或 main，以 git branch 为准
```

## 仅回滚过场视频（不回滚代码）

旧视频已备份在：

- `public/media/archive/card-transition-2026-07-12-prev.mp4`
- `public/media/archive/card-transition-web-2026-07-12-prev.mp4`

复制覆盖即可：

```bash
cp public/media/archive/card-transition-2026-07-12-prev.mp4 public/media/card-transition.mp4
cp public/media/archive/card-transition-web-2026-07-12-prev.mp4 public/media/card-transition-web.mp4
```

## 备注

- `.env` 未入库；回滚后如需本地库连接，请保留或恢复自己的 `.env`
- `node_modules` 未入库；回滚后执行 `npm install`
