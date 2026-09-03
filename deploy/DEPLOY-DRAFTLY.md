# 部署到腾讯云轻量 + 宝塔：nav.draftly.cn

与 GitHub Pages（`/nav/`）并行：本站根路径 `/`，并带 API 后台。

## 架构

```
用户 → nav.draftly.cn (宝塔 Nginx 443)
         → 反代 127.0.0.1:8080
              → Docker penn-nav（静态 + /api）
```

## 前置

1. DNS：`draftly.cn` 增加 `A` 记录，主机 `nav` → 服务器公网 IP（如 `101.43.95.33`）
2. 轻量云防火墙放行 **80 / 443**（不必对外开放 8080）
3. 宝塔已安装 **Nginx**；**Docker**（软件商店安装 Docker 管理器，或自行安装 Compose）

## 一、拉代码并启动容器

在宝塔 **终端** 中（路径可改）：

```bash
cd /www/wwwroot
git clone https://github.com/lp-Imagine/nav.git
cd nav
cp deploy/.env.production.example deploy/.env
nano deploy/.env   # 或用宝塔文件管理编辑
```

至少填写：

| 变量 | 说明 |
|------|------|
| `SESSION_SECRET` | 随机长字符串 |
| `ADMIN_PASSWORD` | 后台登录密码 |
| `GITHUB_TOKEN` | 有 `repo` 权限的 PAT（用于「同步到 GitHub」） |
| `FRONTEND_ORIGIN` | `https://nav.draftly.cn` |
| `COOKIE_SECURE` | `true` |

然后：

```bash
docker compose -f deploy/docker-compose.yml up -d --build
curl -s http://127.0.0.1:8080/api/health
# 期望含 "ok":true，配置密码后 "password":true
```

## 二、宝塔建站反代

1. **网站** → **添加站点** → 域名 `nav.draftly.cn`（可不建数据库，PHP 可关闭）
2. 站点 **设置** → **反向代理** → 添加：
   - 目标 URL：`http://127.0.0.1:8080`
   - 发送域名：`$host`
3. **SSL** → Let's Encrypt → 申请 → 开启 **强制 HTTPS**
4. 若面板有 **禁止非常用 HTTP 方法**，请关闭（否则 `PUT /api/db` 同步会失败）

也可参考 [`nginx.host.conf.example`](./nginx.host.conf.example) 手工改配置文件。

## 三、验证

- https://nav.draftly.cn/sim/
- https://nav.draftly.cn/app/
- https://nav.draftly.cn/api/health
- https://nav.draftly.cn/admin/ （密码见 `deploy/.env`）

## 四、日常更新（手动）

```bash
cd /www/wwwroot/nav
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

## 五、push 后自动部署（GitHub Actions）

仓库已含 [`.github/workflows/deploy-vps.yml`](../.github/workflows/deploy-vps.yml)：推送到 `main`（且改动了 `web/` / `server/` / `data/` / `deploy/`）时，会 SSH 到轻量云执行 `git reset --hard origin/main` + `docker compose up -d --build`。

GitHub Pages 仍由原有 `pages.yml` 单独部署，互不影响。

### 5.1 本机生成部署用 SSH 密钥（只做一次）

在你电脑上：

```bash
ssh-keygen -t ed25519 -C "github-actions-nav-deploy" -f ~/.ssh/nav_vps_deploy -N ""
```

把**公钥**写进服务器（宝塔终端，用户建议 `root` 或有 docker 权限的账号）：

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo '这里粘贴 nav_vps_deploy.pub 的整行内容' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

轻量云 **防火墙** 放行 **SSH 端口**（默认 22；若宝塔改过端口则放行该端口）。GitHub Actions 需要能连上。

### 5.2 仓库 Secrets

打开 GitHub：`lp-Imagine/nav` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Name | 值 |
|------|-----|
| `VPS_HOST` | `101.43.95.33` |
| `VPS_USER` | `root`（或你用的 SSH 用户） |
| `VPS_SSH_KEY` | `~/.ssh/nav_vps_deploy` **私钥**全文（含 `BEGIN`/`END`） |
| `VPS_SSH_PORT` | `22`（宝塔若改过则填实际端口） |
| `VPS_DEPLOY_PATH` | `/www/wwwroot/nav`（与首次 clone 路径一致） |

### 5.3 首次仍需手工装好站

自动部署**不会**创建 `deploy/.env`，也不会配宝塔反代。先按上文「一、二」完成一次手动部署，再配 Secrets。

### 5.4 验证自动部署

1. 改点无关紧要的内容推到 `main`，或 Actions 里对 **Deploy VPS** 点 **Run workflow**
2. 打开仓库 **Actions** 看是否绿色
3. 服务器上：`docker ps`、访问 `https://nav.draftly.cn/api/health`

### 5.5 注意

- 服务器目录保持干净：CI 使用 `git reset --hard`，本地未提交改动会被覆盖（`deploy/.env` 已被 gitignore，不受影响）
- 跑 docker 的用户需在 `docker` 组，或使用 `root`
- 构建在服务器上执行，2 核机会稍慢，属正常

数据以 GitHub `data/db.json` 为准：自建站后台同步 → 推仓库后，Pages CI 会更新 `https://lp-Imagine.github.io/nav/`，VPS 也会随本次 push 重建（若路径命中）。

## 排错

| 现象 | 处理 |
|------|------|
| 域名打不开 | 查 DNS、防火墙 80/443、宝塔站点是否启用 |
| `/api/health` 502 | 容器是否在跑：`docker ps`；本机 `curl 127.0.0.1:8080/api/health` |
| 登录后 Cookie 丢失 | 确认已 HTTPS，且 `COOKIE_SECURE=true`、`FRONTEND_ORIGIN` 正确 |
| 同步失败 403/空响应 | 宝塔是否拦截 PUT；`GITHUB_TOKEN` 权限 |
| Actions SSH 失败 | 查 `VPS_*` Secrets、防火墙 SSH 端口、`authorized_keys`、密钥是否匹配 |
| Actions 成功但站未变 | 确认 `VPS_DEPLOY_PATH` 是否就是正在反代的那份目录 |
