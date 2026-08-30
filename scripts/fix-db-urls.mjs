#!/usr/bin/env node
/**
 * Fix broken URLs in data/db.json: replace with updated links or remove dead entries.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../data/db.json')
const LOG_PATH = path.join(__dirname, 'url-fix-log.json')

/** Exact old URL -> new URL */
const URL_REPLACE = {
  'https://luban.aliyun.com/': null,
  'https://dartpad.cn/embed-inline.html?id=7a9764702c0608711e08&split=90': 'https://dartpad.dev/',
  'https://flutterchina.club/': 'https://flutter.cn/',
  'https://material.io/resources/icons/?style=baseline': 'https://fonts.google.com/icons',
  'https://material.io/tools/icons': 'https://fonts.google.com/icons',
  'https://github.com/Sh1d0w/multi_image_picker': null,
  'https://flutter-go.pub/flutter_go_web/#FirstPage': null,
  'https://casbin.org/zh-CN/': 'https://casbin.org/',
  'https://tour.go-zh.org/welcome/1': 'https://go.dev/tour/welcome/1',
  'https://learnku.com/docs/gin-gonic/2019/go-gin-document': 'https://gin-gonic.com/',
  'https://go-zh.org/': 'https://go.dev/',
  'https://eggjs.org/zh-cn/intro/index.html': 'https://www.eggjs.org/zh-CN',
  'https://docs.nestjs.cn/6/introduction': 'https://docs.nestjs.com/',
  'https://github.com/flipxfx/download-git-repo': null,
  'https://github.com/substack/minimist': 'https://github.com/minimistjs/minimist',
  'https://documentup.com/shelljs/shelljs': 'https://github.com/shelljs/shelljs',
  'http://www.passportjs.org/': 'https://github.com/jaredhanson/passport',
  'https://chatie.io/wechaty/': 'https://wechaty.js.org/',
  'https://www.xiejiahe.com/detail/5b52fca1df53a14006035e1e': null,
  'http://visionmedia.github.io/superagent/': 'https://github.com/ladjs/superagent',
  'https://yarnpkg.com/zh-Hans/': 'https://yarnpkg.com/',
  'https://nwjs.org.cn/': 'https://nwjs.io/',
  'https://scrapy.org/': 'https://docs.scrapy.org/en/latest/',
  'https://bop.mol.uno/': null,
  'https://augury.angular.io/': 'https://angular.io/guide/devtools',
  'https://minimamente.com/example/magic_animations/': null,
  'https://rollupjs.org/guide/zh/': 'https://rollupjs.org/introduction/',
  'http://fian.my.id/Waves/#examples': 'https://github.com/fians/Waves',
  'http://mynameismatthieu.com/WOW/': 'https://wowjs.uk/',
  'https://runkit.com/jquense/yup': 'https://github.com/jquense/yup',
  'https://github.com/Marak/faker.js': 'https://github.com/faker-js/faker',
  'https://wangchujiang.com/hotkeys/': 'https://github.com/jaywcjlove/hotkeys-js',
  'http://layer.layui.com/': 'https://layui.dev/',
  'https://react-bootstrap.github.io/getting-started/introduction': 'https://react-bootstrap.github.io/',
  'https://arturbien.github.io/React95': 'https://react95.io/',
  'https://youzan.github.io/zent/zh/guides/install': 'https://github.com/youzan/zent',
  'https://reactnative.cn/docs/0.51/tutorial.html': 'https://reactnative.cn/',
  'https://reactnavigation.org/zh-Hans/': 'https://reactnavigation.org/',
  'https://dvajs.com/': 'https://github.com/dvajs/dva',
  'https://umijs.org/zh-CN': 'https://umijs.org/',
  'https://hooks.umijs.org/': 'https://ahooks.js.org/',
  'https://bizcharts.net/products/bizCharts': 'https://github.com/alibaba/BizCharts',
  'http://adazzle.github.io/react-data-grid/': 'https://github.com/adazzle/react-data-grid',
  'https://react-live.netlify.com/': 'https://github.com/FormidableLabs/react-live',
  'http://www.reactvirtualized.com': 'https://github.com/bvaughn/react-virtualized',
  'http://recharts.org/zh-CN/': 'https://recharts.org/',
  'https://www.html.cn/create-react-app/': 'https://create-react-app.dev/',
  'http://www.redux.org.cn/docs/react-redux/api.html': 'https://cn.redux.js.org/',
  'http://huziketang.mangojuice.top/books/react/': null,
  'https://mobile.ant.design/index-cn': 'https://mobile.ant.design/',
  'http://element-cn.eleme.io/#/zh-CN': 'https://element-plus.org/zh-CN/',
  'http://javascript-puzzlers.herokuapp.com/': null,
  'https://bonsaiden.github.io/JavaScript-Garden/zh/': 'https://github.com/Bonsaiden/JavaScript-Garden',
  'http://www.css88.com/doc/jsdoc/index.html': 'https://jsdoc.app/',
  'http://fe.jskou.com/ice': null,
  'http://css3lib.alloyteam.com/#panel/demo1': null,
  'http://apps.eky.hk/css-triangle-generator/zh-hant': null,
  'https://www.xiejiahe.com/detail/59ec506be9b3310879551f5e': null,
  'https://www.sassmeister.com/': 'https://www.sassmeister.com/',
  'https://jsperf.com/': null,
  'https://github.com/Tencent/omi/tree/master/packages/omix': 'https://github.com/Tencent/omi',
  'https://tencent.github.io/wepy/': 'https://github.com/Tencent/wepy',
  'https://www.color-ui.com/': 'https://github.com/weilanwl/ColorUI',
  'https://vant-contrib.gitee.io/vant-weapp/#/intro': 'https://vant-ui.github.io/vant-weapp/',
  'https://www.1024nav.com/front-junior/': null,
  'https://techblog.toutiao.com/': null,
  'https://imweb.io/topic/tab/all': 'https://imweb.io/',
  'https://help.github.com/cn': 'https://docs.github.com/zh',
  'https://zh.b-ok.global/': null,
  'https://github.com/EbookFoundation/free-programming-books/blob/master/free-programming-books-zh.md':
    'https://github.com/EbookFoundation/free-programming-books/blob/main/books/free-programming-books-zh.md',
  'https://www.docs4dev.com/docs/zh/nginx/current/reference#toolbar-title': 'https://nginx.org/en/docs/',
  'http://www.shiyanbar.com/': null,
  'https://www.jikexueyuan.com/': null,
  'https://www.sequelpro.com/': 'https://sequel-ace.com/',
  'https://github.com/Dreamacro/clash': null,
  'https://www.easyicon.net/covert/': 'https://www.easyicon.net/',
  'http://www.feedvalidator.org/': 'https://www.feedvalidator.org/',
  'https://source.unsplash.com/': null,
  'https://cp.ifval.com/': null,
  'https://box.zjuqsc.com/': null,
  'http://taonienie.com/': null,
  'http://www.asciiworld.com/': null,
  'https://curl.trillworks.com/': 'https://curlconverter.com/',
  'https://github.com/anuraghazra/github-readme-stats/blob/master/readme_cn.md':
    'https://github.com/anuraghazra/github-readme-stats',
  'https://developer.github.com/v4/explorer/': 'https://docs.github.com/en/graphql/overview/explorer',
  'http://hits.dwyl.io/': null,
  'https://paste.ubuntu.com/': null,
  'https://www.releasly.co/': null,
  'http://rap2.taobao.org/': 'https://github.com/thx/rap2-delos',
  'https://yapi.baidu.com/': 'https://github.com/YMFE/yapi',
  'http://www.kk3.tv/': null,
  'http://coder.shengxinjing.cn/': 'https://github.com/shengxinjing/programmer-job-blacklist',
  'https://www.launchaco.com/logo': null,
  'https://ppt.baomitu.com/': null,
  'https://xzlogo.com/': null,
  'https://modao.cc/features': 'https://modao.cc/',
  'https://xiaozhuanlan.com/': null,
  'http://imweb.io/topic/tab/all': 'https://imweb.io/',
  'http://react-china.org/': null,
  'https://zcfy.cc/': null,
  'https://pasteurize.web.ctfcompetition.com/': null,
  'https://www.2cto.com/': 'https://www.2cto.com/',
  'https://github.com/TrojanAZhen/BurpSuitePro-2.1': null,
  'https://phpinfo.me/domain/': null,
  'https://mta.qq.com/mta/': null,
  'https://deno.land/std': 'https://docs.deno.com/runtime/manual/',
  'https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno':
    'https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno',
  'https://rollupjs.org/introduction/': 'https://github.com/rollup/rollup',
  'https://easy-mock.com': null,
  'https://www.tslang.cn/index.html': 'https://www.typescriptlang.org/zh/',
  'https://muse-ui.org/#/zh-CN': null,
  'https://halo.run/': 'https://www.halo.run/',
  'http://sc.ftqq.com': 'https://sct.ftqq.com/',
  'http://www.360converter.com/': null,
  'https://uzer.me/index.html': null,
  'https://xsspt.com/': null,
  'https://www.anquan.org/': null,
  'https://zq.zhaopin.com/': null,
  'https://www.sassmeister.com/': null,
  'https://imweb.io/': null,
  'https://www.easyicon.net/': null,
  'https://www.feedvalidator.org/': 'https://validator.w3.org/feed/',
  'https://www.2cto.com/': null,
  'https://hacpai.com/': 'https://ld246.com/',
}

/** Site names to remove regardless of URL (piracy, duplicates, etc.) */
const REMOVE_NAMES = new Set([
  'BurpSuitePro',
  'kk高清影院',
  '鹿班',
])

const log = { replaced: [], removed: [], urlObjectFixed: [] }

function replaceUrl(url) {
  if (!url) return url
  if (url in URL_REPLACE) {
    const next = URL_REPLACE[url]
    log.replaced.push({ from: url, to: next })
    return next
  }
  return url
}

function cleanNav(nodes) {
  if (!Array.isArray(nodes)) return []
  const out = []
  for (const node of nodes) {
    if (node.nav) {
      node.nav = cleanNav(node.nav)
      if (node.nav.length === 0 && !node.url) continue
    }

    if (node.url) {
      if (REMOVE_NAMES.has(node.name)) {
        log.removed.push({ name: node.name, url: node.url, reason: 'remove-list' })
        continue
      }

      const next = replaceUrl(node.url)
      if (next === null) {
        log.removed.push({ name: node.name, url: node.url, reason: 'dead-url' })
        continue
      }
      node.url = next

      if (node.urls && typeof node.urls === 'object') {
        const cleaned = {}
        for (const [k, v] of Object.entries(node.urls)) {
          const nv = replaceUrl(v)
          if (nv !== null) cleaned[k] = nv
          else log.urlObjectFixed.push({ name: node.name, key: k, from: v })
        }
        node.urls = cleaned
      }
    }

    out.push(node)
  }
  return out
}

const raw = fs.readFileSync(DB_PATH, 'utf8')
const data = JSON.parse(raw)
const before = JSON.stringify(data).match(/"url":/g)?.length ?? 0
const fixed = cleanNav(data)
const after = JSON.stringify(fixed).match(/"url":/g)?.length ?? 0

fs.writeFileSync(DB_PATH, JSON.stringify(fixed))
log.summary = { before, after, removed: before - after }
fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2))

console.log(`Sites before: ${before}, after: ${after}, removed: ${before - after}`)
console.log(`Replaced: ${log.replaced.filter((r) => r.to).length}`)
console.log(`Removed entries: ${log.removed.length}`)
console.log(`Log: ${LOG_PATH}`)
