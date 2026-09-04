/** 规范化图标 URL，并提供多源 favicon 回退（国内优先：COS → DDG → Yandex → 站点 → Google） */

const ICON_CDN_BASE = 'https://img.penn-notes.draftly.cn/nav/icons'

export function getDomain(url: string): string | null {
  try {
    const u = new URL(url.startsWith('//') ? `https:${url}` : url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function normalizeIconUrl(icon?: string | null): string | null {
  if (!icon || typeof icon !== 'string') return null
  const trimmed = icon.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//, 'https://')
  return trimmed
}

function isGoogleFaviconUrl(url: string): boolean {
  return /google\.[^/]+\/s2\/favicons/i.test(url)
}

function isOurCdnIcon(url: string): boolean {
  return url.includes('img.penn-notes.draftly.cn/nav/icons/')
}

function domainFromOurCdn(url: string): string | null {
  try {
    const u = new URL(url)
    if (!/img\.penn-notes\.draftly\.cn$/i.test(u.hostname)) return null
    const m = u.pathname.match(/\/nav\/icons\/([^/]+)\.(png|ico|jpe?g|gif|webp|svg)$/i)
    return m ? m[1].toLowerCase() : null
  } catch {
    return null
  }
}

function domainFromGoogleFavicon(url: string): string | null {
  try {
    const domain = new URL(url).searchParams.get('domain')
    if (!domain) return null
    return decodeURIComponent(domain).replace(/^www\./, '') || null
  } catch {
    return null
  }
}

function safeKeyDomain(domain: string) {
  return domain.toLowerCase().replace(/[^a-z0-9.-]/g, '_')
}

/** COS 上的图标（迁移后存在）；放在最前尝试 */
export function cosIconCandidates(domain: string): string[] {
  const key = safeKeyDomain(domain)
  return [`${ICON_CDN_BASE}/${key}.png`, `${ICON_CDN_BASE}/${key}.ico`, `${ICON_CDN_BASE}/${key}.jpg`]
}

/** 按国内可达性排序的 favicon 候选（失败由 SiteIcon onError 切换） */
export function faviconSourcesForDomain(domain: string, size = 64): string[] {
  const host = domain.replace(/^www\./, '')
  if (!host) return []
  const sz = Math.min(Math.max(size, 16), 128)
  return [
    ...cosIconCandidates(host),
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://favicon.yandex.net/favicon/v2/${host}?size=${sz}`,
    `https://${host}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${sz}`,
  ]
}

/** @deprecated 保留兼容；请优先用 iconCandidates */
export function faviconFromSite(url: string, size = 64): string | null {
  const domain = getDomain(url)
  if (!domain) return null
  return faviconSourcesForDomain(domain, size)[0] || null
}

export function siteInitial(name: string): string {
  const plain = name.replace(/<[^>]+>/g, '').trim()
  if (!plain) return '?'
  const ch = [...plain][0]
  return ch.toUpperCase()
}

/**
 * 图标加载顺序：
 * 1. 数据里的自定义 icon（COS / 非 Google）
 * 2. COS 按域名猜测 + DDG / Yandex / 站点 / Google
 * 全失败后由 SiteIcon 显示字母占位
 */
export function iconCandidates(
  icon: string | null | undefined,
  siteUrl: string,
  size = 64,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (u: string | null | undefined) => {
    if (!u || seen.has(u)) return
    seen.add(u)
    out.push(u)
  }

  const primary = normalizeIconUrl(icon)
  let domain: string | null = null

  if (primary) {
    if (isGoogleFaviconUrl(primary)) {
      domain = domainFromGoogleFavicon(primary)
    } else if (isOurCdnIcon(primary)) {
      push(primary)
      domain = domainFromOurCdn(primary)
    } else {
      push(primary)
    }
  }

  if (!domain) domain = getDomain(siteUrl)
  if (!domain && primary) domain = domainFromOurCdn(primary) || getDomain(primary)

  if (domain) {
    for (const src of faviconSourcesForDomain(domain, size)) push(src)
  }

  return out
}
