import type { INavProps } from './types'

const API_BASE = (import.meta.env.PUBLIC_API_BASE as string | undefined) ?? '/api'

export interface ApiHealth {
  ok: boolean
  auth: boolean
  sync: boolean
  oauth: boolean
  password: boolean
}

export interface ApiSession {
  loggedIn: boolean
  mode?: 'password' | 'github'
  user?: string
}

function apiUrl(path: string) {
  const base = API_BASE.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  // Astro trailingSlash:always 时，Vite 代理要带尾斜杠才会命中 /api
  return `${base}${p.endsWith('/') ? p : `${p}/`}`
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`)
  return data as T
}

export async function checkApiHealth(): Promise<ApiHealth | null> {
  try {
    return await api<ApiHealth>('/health')
  } catch {
    return null
  }
}

export async function getApiSession(): Promise<ApiSession> {
  return api<ApiSession>('/auth/session')
}

export async function loginWithPassword(password: string) {
  return api<{ ok: boolean }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export async function logoutApi() {
  return api<{ ok: boolean }>('/auth/logout', { method: 'POST' })
}

export function githubOAuthUrl() {
  return apiUrl('/auth/github')
}

export async function syncDbToServer(list: INavProps[]) {
  return api<{ ok: boolean }>('/db', {
    method: 'PUT',
    body: JSON.stringify({ content: list }),
  })
}

export function isApiMode(health: ApiHealth | null) {
  return !!health?.ok
}
