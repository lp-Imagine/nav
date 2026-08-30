纯静态网址导航，基于 **Astro + React 岛屿** 重构。数据仍在仓库 `data/`，后台可通过 **服务端 API** 安全同步到 GitHub。

在线预览（部署后）：GitHub Pages 或自建域名。

## 特性

- 纯静态 SSG，可托管到 GitHub Pages / Nginx / Docker
- 保留原有 `data/db.json` 等数据结构（约 800+ 站点）
- Sim 桌面主题 + App 移动主题 + Admin 后台
- 站内 / 多引擎搜索、深浅色切换
- 后台：分类/网站 CRUD、拖拽排序、书签导入
- **可选 API 后端**：密码登录 / GitHub OAuth，Token 不暴露给浏览器

## 本地开发

需要 **Node.js ≥ 22.12**。

### 仅前台（无后端）

```bash
cd web && npm install && npm run dev
```

### 前台 + API 后端（推荐）

```bash
# 1. 配置 server/.env（复制 server/.env.example）
cp server/.env.example server/.env
# 填写 ADMIN_PASSWORD、GITHUB_TOKEN、SESSION_SECRET

# 2. 安装依赖
cd server && npm install && cd ../web && npm install

# 3. 同时启动
cd .. && npm run dev:all
```

或在仓库根目录：

```bash
npm run dev:all
```

常用地址：

- http://127.0.0.1:4321/sim/
- http://127.0.0.1:4321/app/
- http://127.0.0.1:4321/admin/
- http://127.0.0.1:8787/api/health（API 健康检查）

## 配置

站点配置：[`web/src/lib/config.ts`](web/src/lib/config.ts)

| 字段 | 说明 |
|------|------|
| `gitRepoUrl` | GitHub 仓库地址 |
| `branch` | 默认 `main` |
| `githubClientId` | 可选，纯前端 OAuth 设备码登录 |
| `title` / `description` / `keywords` | SEO 与品牌文案 |
| `simThemeConfig` | Sim 主题海报与描述 |
| `basePath` | 文档用；实际 `base` 由 `PUBLIC_BASE` 控制 |

API 配置：[`server/.env.example`](server/.env.example)

| 变量 | 说明 |
|------|------|
| `SESSION_SECRET` | 会话签名密钥（必填） |
| `ADMIN_PASSWORD` | 管理员密码登录 |
| `GITHUB_TOKEN` | 服务端持有的 PAT，浏览器不可见 |
| `GITHUB_CLIENT_ID/SECRET` | 可选 GitHub OAuth |
| `OAUTH_CALLBACK_URL` | OAuth 回调，生产需改为公网 URL |

数据文件：

- `data/db.json` — 导航主数据
- `data/search.json` — 搜索引擎
- `data/tag.json` — 标签

## 后台登录方案

| 模式 | 适用场景 | 说明 |
|------|----------|------|
| **服务端 API（推荐）** | 自建 / Docker | 密码或 GitHub OAuth 登录，同步经 `/api/db` 代理 |
| **直连 GitHub Token** | 仅 GitHub Pages | 无后端时降级，Token 存 localStorage |
| **导出 JSON** | 任意 | 本地编辑后手动 git commit |

### API 模式流程

1. 部署 `server/` 并配置 `.env`
2. Nginx 将 `/api/` 反代到 Node（见 `deploy/nginx.conf.example`）
3. 打开 `/admin/`，输入管理员密码登录
4. 编辑后点「同步到 GitHub」，CI 自动构建部署

## 部署：GitHub Pages

GitHub Pages **仅托管静态文件**，无法运行 API。可选：

- Pages 托管前台 + 另部署 API（VPS / Docker / Cloudflare Workers）
- 或继续使用浏览器 Token 直连模式

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**
2. 推送 `main` 触发 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
3. 构建使用 `PUBLIC_BASE=/nav/`

## 部署：Docker（静态 + API 一体）

```bash
docker build -f deploy/Dockerfile -t penn-nav .
docker run --rm -p 8080:80 \
  -e SESSION_SECRET=your-secret \
  -e ADMIN_PASSWORD=your-password \
  -e GITHUB_TOKEN=ghp_xxx \
  penn-nav
```

访问 http://localhost:8080/admin/ ，密码登录后同步。

## 部署：自建服务器

```bash
cd web && PUBLIC_BASE=/ npm run build
cd ../server && npm ci && npm run build
# 静态产物 → /var/www/nav
# API: node server/dist/index.js（可用 systemd/pm2 守护）
```

Nginx 示例：[`deploy/nginx.conf.example`](deploy/nginx.conf.example)

## 从旧 Angular 版升级

本仓库已切换到 `web/` 应用。请继续只维护 `data/` 与 `web/src/lib/config.ts`。

## 许可

见 [LICENSE](LICENSE)。
