# 可选：静态站点 + API 后端一体镜像
# docker build -f deploy/Dockerfile -t penn-nav .
# docker run --rm -p 8080:80 \
#   -e SESSION_SECRET=your-secret \
#   -e ADMIN_PASSWORD=your-password \
#   -e GITHUB_TOKEN=ghp_xxx \
#   penn-nav

FROM node:22-alpine AS build-web
WORKDIR /repo
COPY web/package.json web/package-lock.json ./web/
WORKDIR /repo/web
RUN npm ci
WORKDIR /repo
COPY data ./data
COPY web ./web
WORKDIR /repo/web
ENV PUBLIC_BASE=/
RUN npm run build

FROM node:22-alpine AS build-api
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server ./
RUN npm run build && npm prune --omit=dev

FROM nginx:1.27-alpine
RUN apk add --no-cache nodejs
COPY deploy/nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY deploy/start.sh /start.sh
RUN chmod +x /start.sh
COPY --from=build-web /repo/web/dist /usr/share/nginx/html
COPY --from=build-api /app /app/server
ENV PORT=8787
EXPOSE 80
CMD ["/start.sh"]
