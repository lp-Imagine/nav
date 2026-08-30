import { config } from './config.js'

const API = 'https://api.github.com'

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function getFileSha(token: string, path = config.dbPath) {
  const url = `${API}/repos/${config.githubOwner}/${config.githubRepo}/contents/${path}?ref=${encodeURIComponent(config.githubBranch)}`
  const res = await fetch(url, { headers: headers(token) })
  if (!res.ok) throw new Error(`读取 GitHub 文件失败 (${res.status})`)
  const data = (await res.json()) as { sha: string }
  return data.sha
}

export async function updateDbFile(token: string, content: string) {
  const sha = await getFileSha(token)
  const url = `${API}/repos/${config.githubOwner}/${config.githubRepo}/contents/${config.dbPath}`
  const body = {
    message: 'rebot(CI): update db',
    branch: config.githubBranch,
    content: Buffer.from(content, 'utf8').toString('base64'),
    sha,
  }
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message || `同步失败 (${res.status})`)
  }
  return res.json()
}

export async function exchangeOAuthCode(code: string) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
      redirect_uri: config.oauthCallbackUrl,
    }),
  })
  if (!res.ok) throw new Error(`OAuth 交换失败 (${res.status})`)
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string }
  if (!data.access_token) throw new Error(data.error_description || data.error || 'OAuth 无 token')
  return data.access_token
}

export async function verifyGithubUser(token: string) {
  const res = await fetch(`${API}/user`, { headers: headers(token) })
  if (!res.ok) throw new Error(`GitHub Token 无效 (${res.status})`)
  return res.json() as Promise<{ login: string }>
}
