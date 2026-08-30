import config, { getRepoParts } from './config'

const API = 'https://api.github.com'

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  }
}

export async function verifyToken(token: string) {
  const res = await fetch(`${API}/user`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`Token 无效或权限不足 (${res.status})`)
  return res.json()
}

export interface DeviceFlowStart {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export async function startDeviceFlow(clientId: string): Promise<DeviceFlowStart> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: 'repo' }),
  })
  if (!res.ok) throw new Error(`设备码请求失败 (${res.status})`)
  return res.json()
}

export async function pollDeviceToken(clientId: string, deviceCode: string) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })
  return res.json() as Promise<{ access_token?: string; error?: string; error_description?: string }>
}

export async function getFileContent(path: string, branch = config.branch) {
  const { owner, repo } = getRepoParts()
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    { headers: authHeaders(getToken() || '') },
  )
  if (!res.ok) throw new Error(`读取文件失败 (${res.status})`)
  return res.json() as Promise<{ sha: string; content?: string }>
}

export async function updateFileContent(opts: {
  message: string
  content: string
  path: string
  branch?: string
  isEncode?: boolean
}) {
  const {
    message,
    content,
    path,
    branch = config.branch,
    isEncode = true,
  } = opts
  const { owner, repo } = getRepoParts()
  const token = getToken()
  if (!token) throw new Error('未登录')

  const fileInfo = await getFileContent(path, branch)
  const body = {
    message: `rebot(CI): ${message}`,
    branch,
    content: isEncode ? btoa(unescape(encodeURIComponent(content))) : content,
    sha: fileInfo.sha,
  }

  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `同步失败 (${res.status})`)
  }
  return res.json()
}

const TOKEN_KEY = 'token'

export function getToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn() {
  return !!getToken()
}

export const DB_PATH = 'data/db.json'
