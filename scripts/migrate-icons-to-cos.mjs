/**
 * 将 data/db.json + data/search.json 中的站点图标迁移到腾讯云 COS
 *（复用 penn-notes 桶与域名 img.penn-notes.draftly.cn）
 *
 * 用法：
 *   1. 在 nav/.env 填入 COS_*（或 export 环境变量）
 *   2. npm i cos-nodejs-sdk-v5 --no-save   # 或装到根 package
 *   3. node scripts/migrate-icons-to-cos.mjs           # 下载+上传+改写 JSON
 *      node scripts/migrate-icons-to-cos.mjs --dry-run # 只统计/试下下载
 *      node scripts/migrate-icons-to-cos.mjs --download-only
 *      node scripts/migrate-icons-to-cos.mjs --rewrite-only  # 本地已有 cache 时只改 JSON
 *
 * Env:
 *   COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION, COS_CDN_BASE
 * 默认：
 *   COS_BUCKET=penn-notes-img-1300329311
 *   COS_REGION=ap-guangzhou
 *   COS_CDN_BASE=https://img.penn-notes.draftly.cn
 *   对象键：nav/icons/<domain>.<ext>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CACHE_DIR = path.join(ROOT, '.cache', 'icons')
const DB_PATH = path.join(ROOT, 'data', 'db.json')
const SEARCH_PATH = path.join(ROOT, 'data', 'search.json')
const REPORT_PATH = path.join(ROOT, '.cache', 'icons-migrate-report.json')

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry-run')
const DOWNLOAD_ONLY = args.has('--download-only')
const REWRITE_ONLY = args.has('--rewrite-only')
const FORCE = args.has('--force')
const CONCURRENCY = Number(process.env.ICON_CONCURRENCY || 8)

function loadDotEnv() {
  for (const envPath of [path.join(ROOT, '.env'), path.join(ROOT, 'server', '.env')]) {
    if (!fs.existsSync(envPath)) continue
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 0) continue
      const key = t.slice(0, i).trim()
      let val = t.slice(i + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  }
}

loadDotEnv()

const CDN_BASE = (process.env.COS_CDN_BASE || 'https://img.penn-notes.draftly.cn').replace(/\/+$/, '')
const KEY_PREFIX = (process.env.ICON_COS_PREFIX || 'nav/icons').replace(/^\/+|\/+$/g, '')

function cosConfigured() {
  return Boolean(
    process.env.COS_SECRET_ID &&
      process.env.COS_SECRET_KEY &&
      (process.env.COS_BUCKET || 'penn-notes-img-1300329311') &&
      (process.env.COS_REGION || 'ap-guangzhou'),
  )
}

function getDomain(url) {
  try {
    return new URL(url.startsWith('//') ? `https:${url}` : url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function domainFromGoogleFavicon(icon) {
  try {
    const u = new URL(icon.startsWith('//') ? `https:${icon}` : icon)
    if (!/google\.[^/]+\/s2\/favicons/i.test(u.href)) return null
    const d = u.searchParams.get('domain')
    return d ? decodeURIComponent(d).replace(/^www\./, '') : null
  } catch {
    return null
  }
}

function safeKeyDomain(domain) {
  return domain.toLowerCase().replace(/[^a-z0-9.-]/g, '_')
}

function collectDomains(db, search) {
  const domains = new Set()
  const add = (d) => {
    if (d && d.includes('.')) domains.add(d.toLowerCase().replace(/^www\./, ''))
  }
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (n.url) add(getDomain(n.url))
      if (n.icon) add(domainFromGoogleFavicon(n.icon) || (n.icon.startsWith('http') ? getDomain(n.icon) : null))
      if (n.nav) walk(n.nav)
    }
  }
  walk(db)
  for (const s of search) {
    if (s.url) add(getDomain(s.url))
    if (s.icon) add(domainFromGoogleFavicon(s.icon) || getDomain(s.icon))
  }
  return [...domains].sort()
}

function sourceUrls(domain) {
  return [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://favicon.yandex.net/favicon/v2/${domain}?size=64`,
    `https://${domain}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
  ]
}

function extFromContentType(ct, url) {
  const c = (ct || '').toLowerCase()
  if (c.includes('png')) return 'png'
  if (c.includes('jpeg') || c.includes('jpg')) return 'jpg'
  if (c.includes('webp')) return 'webp'
  if (c.includes('gif')) return 'gif'
  if (c.includes('svg')) return 'svg'
  if (c.includes('icon')) return 'ico'
  const m = String(url).match(/\.(png|jpe?g|webp|gif|svg|ico)(?:\?|$)/i)
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png'
}

async function fetchIcon(domain) {
  const errors = []
  for (const url of sourceUrls(domain)) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
        headers: { 'user-agent': 'penn-nav-icon-migrate/1.0' },
      })
      if (!res.ok) {
        errors.push(`${url} → ${res.status}`)
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 32 || buf.length > 1_500_000) {
        errors.push(`${url} → bad size ${buf.length}`)
        continue
      }
      const ext = extFromContentType(res.headers.get('content-type'), url)
      return { buf, ext, source: url }
    } catch (e) {
      errors.push(`${url} → ${(e && e.message) || e}`)
    }
  }
  return { error: errors.slice(0, 4).join('; ') }
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const cur = i++
      results[cur] = await fn(items[cur], cur)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function getCos() {
  const { default: COS } = await import('cos-nodejs-sdk-v5')
  const bucket = process.env.COS_BUCKET || 'penn-notes-img-1300329311'
  const region = process.env.COS_REGION || 'ap-guangzhou'
  const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
  })
  const call = (method, params) =>
    new Promise((resolve, reject) => {
      cos[method]({ Bucket: bucket, Region: region, ...params }, (err, data) =>
        err ? reject(err) : resolve(data),
      )
    })
  return { call, bucket, region }
}

function contentTypeForExt(ext) {
  return (
    {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
    }[ext] || 'application/octet-stream'
  )
}

function cdnUrlFor(domain, ext) {
  return `${CDN_BASE}/${KEY_PREFIX}/${safeKeyDomain(domain)}.${ext}`
}

function rewriteIcons(node, domainToUrl) {
  let changed = 0
  if (Array.isArray(node)) {
    for (const item of node) changed += rewriteIcons(item, domainToUrl)
    return changed
  }
  if (!node || typeof node !== 'object') return 0

  let domain = null
  if (node.url) domain = getDomain(node.url)
  if (!domain && node.icon) domain = domainFromGoogleFavicon(node.icon) || getDomain(node.icon)
  if (domain && domainToUrl[domain]) {
    const next = domainToUrl[domain]
    if (node.icon !== next) {
      node.icon = next
      changed++
    }
  }
  if (node.nav) changed += rewriteIcons(node.nav, domainToUrl)
  return changed
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  const search = JSON.parse(fs.readFileSync(SEARCH_PATH, 'utf8'))
  const domains = collectDomains(db, search)
  console.log(`domains: ${domains.length}`)
  console.log(`cdn: ${CDN_BASE}/${KEY_PREFIX}/<domain>.<ext>`)

  const metaPath = path.join(CACHE_DIR, '_meta.json')
  /** @type {Record<string, { ext: string, source?: string, sha1?: string, key?: string, url?: string, error?: string }>} */
  let meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {}

  if (!REWRITE_ONLY) {
    const todo = FORCE ? domains : domains.filter((d) => !(meta[d] && meta[d].ext && !meta[d].error))
    console.log(`download: ${todo.length} (skip cached: ${domains.length - todo.length})`)

    let ok = 0
    let fail = 0
    await mapPool(todo, CONCURRENCY, async (domain) => {
      const got = await fetchIcon(domain)
      if (got.error) {
        fail++
        meta[domain] = { ...(meta[domain] || {}), error: got.error }
        process.stdout.write(`✗ ${domain}\n`)
        return
      }
      const file = path.join(CACHE_DIR, `${safeKeyDomain(domain)}.${got.ext}`)
      fs.writeFileSync(file, got.buf)
      meta[domain] = {
        ext: got.ext,
        source: got.source,
        sha1: createHash('sha1').update(got.buf).digest('hex'),
        error: undefined,
      }
      ok++
      process.stdout.write(`✓ ${domain} (${got.ext}, ${got.buf.length}B)\n`)
    })
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
    console.log(`download done: ok=${ok} fail=${fail}`)
  }

  if (DOWNLOAD_ONLY || DRY) {
    fs.writeFileSync(
      REPORT_PATH,
      JSON.stringify({ at: new Date().toISOString(), domains: domains.length, meta }, null, 2),
    )
    console.log(DRY ? 'dry-run: skip upload/rewrite' : 'download-only: done')
    return
  }

  if (!cosConfigured()) {
    throw new Error(
      '缺少 COS 环境变量。请在 nav/.env 配置 COS_SECRET_ID / COS_SECRET_KEY（可选 COS_BUCKET/COS_REGION/COS_CDN_BASE）',
    )
  }

  const { call } = await getCos()
  let uploaded = 0
  let skipped = 0
  for (const domain of domains) {
    const m = meta[domain]
    if (!m?.ext || m.error) continue
    const local = path.join(CACHE_DIR, `${safeKeyDomain(domain)}.${m.ext}`)
    if (!fs.existsSync(local)) continue
    const key = `${KEY_PREFIX}/${safeKeyDomain(domain)}.${m.ext}`
    const url = `${CDN_BASE}/${key}`
    if (!FORCE) {
      try {
        await call('headObject', { Key: key })
        m.key = key
        m.url = url
        skipped++
        continue
      } catch {
        /* upload */
      }
    }
    const body = fs.readFileSync(local)
    await call('putObject', {
      Key: key,
      Body: body,
      ContentType: contentTypeForExt(m.ext),
      ContentLength: body.length,
    })
    m.key = key
    m.url = url
    uploaded++
    process.stdout.write(`↑ ${key}\n`)
  }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  console.log(`upload: new=${uploaded} exists=${skipped}`)

  const domainToUrl = {}
  for (const [domain, m] of Object.entries(meta)) {
    if (m.url) domainToUrl[domain] = m.url
    else if (m.ext) domainToUrl[domain] = cdnUrlFor(domain, m.ext)
  }

  const dbChanged = rewriteIcons(db, domainToUrl)
  const searchChanged = rewriteIcons(search, domainToUrl)
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n')
  fs.writeFileSync(SEARCH_PATH, JSON.stringify(search, null, 2) + '\n')
  console.log(`rewrite: db=${dbChanged} search=${searchChanged}`)

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        domains: domains.length,
        uploaded,
        skipped,
        dbChanged,
        searchChanged,
        mapped: Object.keys(domainToUrl).length,
      },
      null,
      2,
    ),
  )
  console.log(`report: ${REPORT_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
