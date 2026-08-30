#!/usr/bin/env node
/** Verify candidate replacement URLs */
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

const candidates = {
  'DartPad': 'https://dartpad.dev/',
  'Flutter Icon': 'https://fonts.google.com/icons',
  'Flutter': 'https://flutter.cn/',
  'casbin': 'https://casbin.org/',
  'Go语言之旅': 'https://go.dev/tour/welcome/1',
  'gin': 'https://gin-gonic.com/docs/',
  'Golang': 'https://go.dev/',
  'Egg.js': 'https://www.eggjs.org/zh-CN',
  'nest': 'https://docs.nestjs.com/',
  'minimist': 'https://github.com/minimistjs/minimist',
  'shelljs': 'https://shelljs.io/',
  'passport': 'https://www.passportjs.org/',
  'wechaty': 'https://wechaty.js.org/',
  'superagent': 'https://ladjs.github.io/superagent/',
  'Yarn': 'https://yarnpkg.com/',
  'Scrapy': 'https://scrapy.org/',
  'wow.js': 'https://wowjs.uk/',
  'Faker': 'https://github.com/faker-js/faker',
  'hotkeys': 'https://github.com/jaywcjlove/hotkeys-js',
  'react-bootstrap': 'https://react-bootstrap.github.io/',
  'React95': 'https://react95.io/',
  'React Native': 'https://reactnative.cn/',
  'React Navigation': 'https://reactnavigation.org/',
  'umijs': 'https://umijs.org/',
  'umijs/hooks': 'https://ahooks.js.org/',
  'BizCharts': 'https://bizcharts.taobao.com/',
  'react-data-grid': 'https://adazzle.github.io/react-data-grid/',
  'recharts': 'https://recharts.org/',
  'Redux': 'https://cn.redux.js.org/',
  'Ant Design Mobile': 'https://mobile.ant.design/',
  'Element': 'https://element-plus.org/zh-CN/',
  'JavaScript 秘密花园': 'https://bonsaiden.github.io/JavaScript-Garden/zh/',
  'vant-weapp': 'https://vant-ui.github.io/vant-weapp/',
  'GitHub Docs': 'https://docs.github.com/zh',
  '免费的编程中文书籍索引': 'https://github.com/EbookFoundation/free-programming-books/blob/main/books/free-programming-books-zh.md',
  'nginx': 'https://nginx.org/en/docs/',
  'Sequel Pro': 'https://sequel-ace.com/',
  'github-readme-stats': 'https://github.com/anuraghazra/github-readme-stats',
  'GraphQL Explorer': 'https://docs.github.com/en/graphql/overview/explorer',
  'RAP2': 'https://github.com/thx/rap2-delos',
  '墨刀': 'https://modao.cc/',
  'YApi': 'https://github.com/YMFE/yapi',
  'DvaJS': 'https://github.com/dvajs/dva',
  'create-react-app': 'https://create-react-app.dev/',
  'zent': 'https://github.com/youzan/zent',
  'react-live': 'https://github.com/FormidableLabs/react-live',
  'nw.js': 'https://nwjs.io/',
  'rollup': 'https://rollupjs.org/',
  'Layer': 'https://layui.dev/',
  'Deno 标准库': 'https://deno.land/std',
  'augury': 'https://angular.io/guide/devtools',
  'wepy': 'https://github.com/Tencent/wepy',
  'omix': 'https://github.com/Tencent/omi',
  'ColorUI': 'https://github.com/weilanwl/ColorUI',
  'hackpai': 'https://hacpai.com/',
  'Zlibrary': 'https://zh.z-lib.gs/',
  '程序员找工作黑名单': 'https://github.com/shengxinjing/programmer-job-blacklist',
  'launchaco': 'https://www.launchaco.com/',
  '小专栏': 'https://xiaozhuanlan.com/',
  'IMWeb': 'https://imweb.io/',
  '众成翻译': 'https://github.com/zcfy-cc/zcfy',
  'YApi alt': 'https://hellosean1025.github.io/yapi/',
}

async function check(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } })
    const ok = r.status >= 200 && r.status < 400 || [401,403,429].includes(r.status)
    return { ok, status: r.status, final: r.url }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

for (const [name, url] of Object.entries(candidates)) {
  const r = await check(url)
  console.log(r.ok ? 'OK' : 'FAIL', r.status || r.error, name, '->', url)
}
