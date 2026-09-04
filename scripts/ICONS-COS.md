# 导航站点图标 → 腾讯云 COS

复用 penn-notes 图床：

| 项 | 值 |
|----|-----|
| 桶 | `penn-notes-img-1300329311`（广州） |
| 域名 | `https://img.penn-notes.draftly.cn` |
| 对象前缀 | `nav/icons/<domain>.<ext>` |
| 示例 | `https://img.penn-notes.draftly.cn/nav/icons/chatgpt.com.png` |

## 为何要迁

`data/db.json` / `search.json` 里大量图标是 Google Favicon 服务，国内慢或打不开。迁到 COS 后与 penn-notes 配图同源，国内访问更稳。

运行时仍保留多源回退（COS → DuckDuckGo → Yandex → 站点 favicon → Google → 字母）。

## 一次性迁移

1. 在仓库根目录建 `.env`（勿提交）：

```env
COS_SECRET_ID=...
COS_SECRET_KEY=...
COS_BUCKET=penn-notes-img-1300329311
COS_REGION=ap-guangzhou
COS_CDN_BASE=https://img.penn-notes.draftly.cn
```

（可与 penn-notes 的 GitHub Secrets / 本地密钥相同。）

2. 安装 SDK 并执行：

```bash
cd /path/to/nav
npm i cos-nodejs-sdk-v5 --no-save
npm run icons:migrate
```

可选参数：

```bash
node scripts/migrate-icons-to-cos.mjs --dry-run        # 不上传、不改 JSON
node scripts/migrate-icons-to-cos.mjs --download-only  # 只下载到 .cache/icons
node scripts/migrate-icons-to-cos.mjs --force          # 强制重下/重传
node scripts/migrate-icons-to-cos.mjs --repair         # 清掉 HTML 伪图标并重下重传
```

脚本会校验文件魔数，拒绝把 HTML/脚本当成 favicon 上传。

3. 脚本会：

- 收集约 700+ 域名
- 多源下载 favicon → `.cache/icons/`
- 上传到 COS `nav/icons/`
- 改写 `data/db.json`、`data/search.json` 的 `icon` 字段为 CDN URL

4. 抽查：`https://img.penn-notes.draftly.cn/nav/icons/chatgpt.com.png`  
5. `git add data/ && git commit && git push`（触发 Pages + VPS 部署）

## 控制台

腾讯云 COS → 桶 `penn-notes-img-1300329311` → 应出现文件夹 **`nav/`** → **`icons/`**。无需新建桶或新域名。
