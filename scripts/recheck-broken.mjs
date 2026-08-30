#!/usr/bin/env node
/** Re-verify broken URLs with GET + http/https fallback */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-check-report.json'), 'utf8'))

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function probe(url, timeout = 15000) {
  const variants = [url]
  if (url.startsWith('https://')) variants.push(url.replace('https://', 'http://'))
  if (url.startsWith('http://')) variants.push(url.replace('http://', 'https://'))

  for (const u of variants) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeout)
    try {
      const res = await fetch(u, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      })
      clearTimeout(t)
      if (res.status >= 200 && res.status < 400) {
        return { ok: true, status: res.status, finalUrl: res.url, tried: u }
      }
      if ([401, 403, 429].includes(res.status)) {
        // Bot blocked but site likely alive
        return { ok: true, status: res.status, finalUrl: res.url, tried: u, blocked: true }
      }
    } catch {
      clearTimeout(t)
    }
  }
  return { ok: false }
}

const broken = report.brokenList
const results = []
for (let i = 0; i < broken.length; i++) {
  const b = broken[i]
  const r = await probe(b.url)
  results.push({ ...b, recheck: r })
  if ((i + 1) % 20 === 0) process.stdout.write(`\r${i + 1}/${broken.length}`)
}
console.log(`\nRechecked ${broken.length}`)

const stillBroken = results.filter((r) => !r.recheck.ok)
const recovered = results.filter((r) => r.recheck.ok)
console.log(`Recovered: ${recovered.length}, Still broken: ${stillBroken.length}`)

const out = path.join(__dirname, 'url-recheck-report.json')
fs.writeFileSync(out, JSON.stringify({ stillBroken, recovered }, null, 2))
console.log(`Saved: ${out}`)

console.log('\nStill broken:')
for (const s of stillBroken) {
  console.log(`  [${s.error}] ${s.name}: ${s.url}`)
}
