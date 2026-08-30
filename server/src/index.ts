import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { authConfigured, config, syncConfigured } from './config.js'
import {
  clearSession,
  createSession,
  githubTokenForSession,
  readSession,
  requireSession,
} from './session.js'
import { exchangeOAuthCode, updateDbFile, verifyGithubUser } from './github.js'

const app = new Hono()

app.use(
  '/api/*',
  cors({
    origin: [config.frontendOrigin, 'http://127.0.0.1:4321', 'http://localhost:4321'],
    credentials: true,
  }),
)

app.get('/', (c) =>
  c.json({
    name: 'nav-api',
    docs: {
      health: '/api/health',
      session: '/api/auth/session',
      admin: `${config.frontendOrigin.replace(/\/$/, '')}/admin/`,
    },
  }),
)

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    auth: authConfigured(),
    sync: syncConfigured(),
    oauth: !!(config.githubClientId && config.githubClientSecret),
    password: !!config.adminPassword,
  }),
)

app.get('/api/auth/session', async (c) => {
  const session = await readSession(c)
  if (!session) return c.json({ loggedIn: false })
  return c.json({
    loggedIn: true,
    mode: session.mode,
    user: session.sub,
  })
})

app.post('/api/auth/login', async (c) => {
  if (!config.adminPassword) {
    return c.json({ error: '服务端未配置 ADMIN_PASSWORD' }, 503)
  }
  const body = await c.req.json<{ password?: string }>().catch(() => ({ password: '' }))
  if (!body.password || body.password !== config.adminPassword) {
    return c.json({ error: '密码错误' }, 401)
  }
  await createSession(c, { sub: 'admin', mode: 'password' })
  return c.json({ ok: true, mode: 'password' })
})

app.get('/api/auth/github', (c) => {
  if (!config.githubClientId) return c.text('未配置 GITHUB_CLIENT_ID', 503)
  const params = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: config.oauthCallbackUrl,
    scope: 'repo',
  })
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`)
})

app.get('/api/auth/github/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.text('缺少 code', 400)
  try {
    const token = await exchangeOAuthCode(code)
    const user = await verifyGithubUser(token)
    await createSession(c, { sub: user.login, mode: 'github', ghToken: token })
    const redirect = `${config.frontendOrigin.replace(/\/$/, '')}/admin/?login=ok`
    return c.redirect(redirect)
  } catch (e) {
    return c.text((e as Error).message, 500)
  }
})

app.post('/api/auth/logout', async (c) => {
  clearSession(c)
  return c.json({ ok: true })
})

app.put('/api/db', async (c) => {
  const session = await requireSession(c)
  if (!session) return c.json({ error: '未登录' }, 401)

  const token = githubTokenForSession(session)
  if (!token) return c.json({ error: '服务端未配置 GITHUB_TOKEN，且 OAuth 会话无写权限' }, 503)

  const body = await c.req.json<{ content?: unknown }>()
  const content =
    typeof body.content === 'string'
      ? body.content
      : JSON.stringify(body.content, null, 2)

  try {
    JSON.parse(content)
  } catch {
    return c.json({ error: 'content 不是合法 JSON' }, 400)
  }

  try {
    await updateDbFile(token, content)
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 502)
  }
})

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`nav-api listening on http://127.0.0.1:${info.port}`)
  if (!authConfigured()) {
    console.warn('[warn] 未配置 ADMIN_PASSWORD 或 GitHub OAuth，登录不可用')
  }
  if (!config.githubToken && !config.githubClientId) {
    console.warn('[warn] 未配置 GITHUB_TOKEN / OAuth，同步不可用')
  }
})

export default app
