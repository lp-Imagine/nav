import { sign, verify } from 'hono/jwt'
import type { Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { config } from './config.js'

const COOKIE = 'nav_session'
const ALG = 'HS256'

export type SessionPayload = {
  sub: string
  mode: 'password' | 'github'
  ghToken?: string
  exp: number
}

export async function createSession(c: Context, payload: Omit<SessionPayload, 'exp'>) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  const token = await sign({ ...payload, exp }, config.sessionSecret, ALG)
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function readSession(c: Context): Promise<SessionPayload | null> {
  const token = getCookie(c, COOKIE)
  if (!token) return null
  try {
    const payload = (await verify(token, config.sessionSecret, ALG)) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function clearSession(c: Context) {
  deleteCookie(c, COOKIE, { path: '/' })
}

export async function requireSession(c: Context) {
  const session = await readSession(c)
  if (!session) return null
  return session
}

export function githubTokenForSession(session: SessionPayload) {
  if (session.mode === 'github' && session.ghToken) return session.ghToken
  if (config.githubToken) return config.githubToken
  return null
}
