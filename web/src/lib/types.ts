export type ThemeType = 'Light' | 'Sim' | 'Side' | 'App' | 'Shortcut'

export interface ITagProp {
  [tagName: string]: {
    color: string
    createdAt: string
    desc?: string
  }
}

export interface INavFourProp {
  name: string
  desc: string
  url: string
  icon?: string | null
  createdAt?: string
  rate?: number
  top?: boolean
  index?: number
  ownVisible?: boolean
  urls?: {
    [tagName: string]: string
  }
}

export interface INavThreeProp {
  title?: string
  icon?: string | null
  createdAt?: string
  collapsed?: boolean
  ownVisible?: boolean
  nav: INavFourProp[]
}

export interface INavTwoProp {
  title?: string
  icon?: string | null
  createdAt?: string
  collapsed?: boolean
  ownVisible?: boolean
  id?: number
  nav: INavThreeProp[]
}

export interface INavProps {
  title: string
  id?: number
  icon?: string | null
  createdAt?: string
  ownVisible?: boolean
  nav: INavTwoProp[]
}

export interface ISearchEngineProps {
  name: string
  url?: string
  icon: string | null
  placeholder?: string
  blocked: boolean
}

export interface IConfig {
  gitRepoUrl: string
  /** GitHub OAuth App Client ID，配置后可使用设备码登录 */
  githubClientId?: string
  branch: string
  hashMode: boolean
  homeUrl?: string
  title: string
  description: string
  keywords: string
  theme: ThemeType
  footerContent?: string | null
  baiduStatisticsUrl?: string
  cnzzStatisticsUrl?: string
  iconfontUrl?: string
  showGithub: boolean
  /** GitHub Pages 子路径，如 /nav/；根域名部署用 / */
  basePath: string
  simThemeConfig: {
    posterImageUrls: string[]
    description: string
  }
}
