#!/usr/bin/env node
import fs from 'node:fs'
const UA = 'Mozilla/5.0 Chrome/120 Safari/537.36'
const urls = {
  'Deno vscode': 'https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno',
  'rollup gh': 'https://github.com/rollup/rollup',
  'typescript zh': 'https://www.typescriptlang.org/zh/',
  'Halo gh': 'https://github.com/halo-dev/halo',
  'Halo site': 'https://www.halo.run/',
  'tableplus': 'https://tableplus.com/',
  'Server酱新': 'https://sct.ftqq.com/',
  'Server酱gh': 'https://github.com/LazyMapper/sc.ftqq.com',
  'sassmeister': 'https://www.sassmeister.com/',
  'imweb': 'https://imweb.io/',
  'hacpai': 'https://hacpai.com/',
  '2cto': 'https://www.2cto.com/',
  'tongji': 'https://tongji.baidu.com/',
  'easyicon': 'https://www.easyicon.net/',
  'feedvalidator': 'https://www.feedvalidator.org/',
}
async function check(url) {
  try {
    const r = await fetch(url, { redirect:'follow', headers:{ 'User-Agent': UA } })
    return { ok: r.status<400||[401,403].includes(r.status), status:r.status }
  } catch(e) { return { ok:false, error:e.message } }
}
for (const [n,u] of Object.entries(urls)) {
  const r = await check(u)
  console.log(r.ok?'OK':'FAIL', r.status||r.error, n, u)
}
