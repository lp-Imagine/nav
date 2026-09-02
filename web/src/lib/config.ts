import type { IConfig } from './types'

const config: IConfig = {
  gitRepoUrl: 'https://github.com/lp-Imagine/nav',
  branch: 'main',
  hashMode: false,
  showGithub: true,
  homeUrl: 'https://imagine-nav.vercel.app',
  title: 'Penn的导航小站',
  description: '收录 AI 工具、前端工程、开源生态与常用效率站点的个人导航',
  keywords: '导航,AI工具,ChatGPT,DeepSeek,Cursor,前端资源,Vite,社区站点,设计师,实用工具,学习资源,Python,网络安全',
  theme: 'Sim',
  basePath: '/',
  footerContent: `
    <div class="footer-total">共收录 \${total} 个网站</div>
    <div>Copyright © 2020–2026 <a href="https://imagine-nav.vercel.app">Penn</a></div>
  `,
  iconfontUrl: '//at.alicdn.com/t/font_2522843_wl70o31sy6.js',
  baiduStatisticsUrl: 'https://hm.baidu.com/hm.js?47d0c0f4fcd160c99c3ef9b22a90eeed',
  cnzzStatisticsUrl: '',
  simThemeConfig: {
    posterImageUrls: [
      'https://cdn.jsdelivr.net/gh/lp-Imagine/lp-Imagine@main/images/6.jpg',
    ],
    description: 'AI、前端与工程效率一站收齐，目前收录 <b>${total}</b> 个站点',
  },
}

export default config

export function getRepoParts() {
  const parts = config.gitRepoUrl.replace(/\.git$/, '').split('/')
  return {
    owner: parts[parts.length - 2],
    repo: parts[parts.length - 1],
  }
}
