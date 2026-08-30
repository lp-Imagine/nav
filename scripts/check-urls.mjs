#!/usr/bin/env node
/**
 * Check all site URLs in data/db.json for accessibility.
 * Usage: node scripts/check-urls.mjs [--concurrency=20] [--timeout=12000]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DB_PATH = path.join(ROOT, 'data/db.json')
const OUT_PATH = path.join(ROOT, 'scripts/url-check-report.json')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const CONCURRENCY = Number(args.concurrency || 20)
const TIMEOUT = Number(args.timeout || 12000)

function walk(nodes, trail = []) {
  const sites = []
  for (const n of nodes) {
    const next = [...trail, n.title || n.name || '?']
    if (n.nav) sites.push(...walk(n.nav, next))
    if (n.url) {
      sites.push({
        name: n.name,
        url: n.url,
        path: next.join(' > '),
        urls: n.urls || {},
      })
    }
  }
  return sites
}

async function checkUrl(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }

  try {
    let res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers,
    })

    clearTimeout(timer)
    const ok =
      (res.status >= 200 && res.status < 400) ||
      [401, 403, 429].includes(res.status)
    return {
      ok,
      status: res.status,
      finalUrl: res.url,
      error: ok ? null : `HTTP ${res.status}`,
    }
  } catch (err) {
    clearTimeout(timer)
    const msg = err.name === 'AbortError' ? 'timeout' : err.message
    return { ok: false, status: 0, finalUrl: url, error: msg }
  }
}

async function pool(items, worker, concurrency) {
  const results = new Array(items.length)
  let idx = 0
  async function run() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run))
  return results
}

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
const sites = walk(data)
const uniqueUrls = [...new Set(sites.map((s) => s.url))]

console.log(`Checking ${uniqueUrls.length} unique URLs (${sites.length} entries)...`)

const urlMap = new Map()
let done = 0

const checks = await pool(
  uniqueUrls,
  async (url) => {
    const result = await checkUrl(url)
    urlMap.set(url, result)
    done++
    if (done % 50 === 0 || done === uniqueUrls.length) {
      process.stdout.write(`\rProgress: ${done}/${uniqueUrls.length}`)
    }
    return { url, ...result }
  },
  CONCURRENCY,
)

console.log('\nDone.')

const broken = []
const ok = []

for (const site of sites) {
  const check = urlMap.get(site.url)
  const entry = { ...site, ...check }
  if (check.ok) ok.push(entry)
  else broken.push(entry)
}

const report = {
  checkedAt: new Date().toISOString(),
  total: sites.length,
  uniqueUrls: uniqueUrls.length,
  ok: ok.length,
  broken: broken.length,
  brokenList: broken.sort((a, b) => a.path.localeCompare(b.path)),
}

fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2))
console.log(`OK: ${ok.length}, Broken: ${broken.length}`)
console.log(`Report: ${OUT_PATH}`)

if (broken.length) {
  console.log('\nBroken URLs:')
  for (const b of broken.slice(0, 30)) {
    console.log(`  [${b.error}] ${b.name}: ${b.url}`)
  }
  if (broken.length > 30) console.log(`  ... and ${broken.length - 30} more`)
}
