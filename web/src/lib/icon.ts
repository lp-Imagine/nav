/** 规范化图标 URL，并提供 favicon 回退 */
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

export function faviconFromSite(url: string, size = 64): string | null {
  const domain = getDomain(url)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}

export function siteInitial(name: string): string {
  const plain = name.replace(/<[^>]+>/g, '').trim()
  if (!plain) return '?'
  const ch = [...plain][0]
  return ch.toUpperCase()
}

export function iconCandidates(icon: string | null | undefined, siteUrl: string): string[] {
  const out: string[] = []
  const primary = normalizeIconUrl(icon)
  if (primary) out.push(primary)
  const fav = faviconFromSite(siteUrl)
  if (fav && !out.includes(fav)) out.push(fav)
  return out
}
