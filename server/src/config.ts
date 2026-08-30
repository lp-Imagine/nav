function required(name: string, fallback?: string) {
  const v = process.env[name] || fallback
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export const config = {
  port: Number(process.env.PORT || 8787),
  sessionSecret: required('SESSION_SECRET', 'dev-only-change-me-in-production'),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  githubOwner: process.env.GITHUB_OWNER || 'lp-Imagine',
  githubRepo: process.env.GITHUB_REPO || 'nav',
  githubBranch: process.env.GITHUB_BRANCH || 'main',
  dbPath: process.env.DB_PATH || 'data/db.json',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  oauthCallbackUrl: process.env.OAUTH_CALLBACK_URL || 'http://127.0.0.1:8787/api/auth/github/callback',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:4321',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
}

export function authConfigured() {
  return !!(config.adminPassword || (config.githubClientId && config.githubClientSecret))
}

export function syncConfigured() {
  return !!(config.githubToken || config.githubClientId)
}
