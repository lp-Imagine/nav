import { useEffect, useMemo, useState } from 'react'
import type { INavProps, INavThreeProp, ISearchEngineProps } from '../../lib/types'
import { fuzzySearch, matchCurrentList, totalWeb, visibleNav } from '../../lib/data'
import { isLoggedIn } from '../../lib/github'
import { useInView, useReducedMotion, useScrollY } from '../../lib/motion'
import SearchBar from './SearchBar'
import SiteIcon from './SiteIcon'
import ThemeToggle from './ThemeToggle'
import styles from './SimView.module.css'

interface Props {
  websiteList: INavProps[]
  searchEngines: ISearchEngineProps[]
  title: string
  descriptionHtml: string
  posterUrl?: string
  footerHtml: string
  gitRepoUrl: string
  showGithub: boolean
  baseUrl: string
}

function AnimatedSection({
  sectionKey,
  section,
  collapsed,
  onToggle,
  reducedMotion,
}: {
  sectionKey: string
  section: INavThreeProp
  collapsed: boolean
  onToggle: () => void
  reducedMotion: boolean
}) {
  const { ref, visible } = useInView<HTMLElement>()

  return (
    <section
      ref={ref}
      className={`${styles.section} ${visible || reducedMotion ? styles.sectionVisible : ''}`}
    >
      <div className={styles.sectionHead}>
        <h2>
          {section.title || '未命名'}
          <span>{section.nav?.length || 0}</span>
        </h2>
        <button type="button" onClick={onToggle}>
          {collapsed ? '展开' : '收起'}
        </button>
      </div>
      <div className={`${styles.gridWrap} ${collapsed ? styles.gridCollapsed : ''}`}>
        <div className={styles.grid}>
          {(section.nav || []).map((site, idx) => (
            <a
              key={site.url + site.name}
              className={styles.card}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              style={reducedMotion ? undefined : { animationDelay: `${Math.min(idx, 8) * 45}ms` }}
            >
              <div className={styles.cardTop}>
                <SiteIcon name={site.name} icon={site.icon} url={site.url} />
                <div className={styles.cardMeta}>
                  <h3 dangerouslySetInnerHTML={{ __html: site.name }} />
                  {site.rate ? (
                    <p className={styles.rate} aria-label={`评分 ${site.rate}`}>
                      {'★'.repeat(Math.round(site.rate))}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className={styles.desc}>{site.desc}</p>
              {site.urls && Object.keys(site.urls).length > 0 ? (
                <div className={styles.tags}>
                  {Object.keys(site.urls).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function SimView(props: Props) {
  const {
    websiteList: initialList,
    searchEngines,
    title,
    descriptionHtml,
    posterUrl,
    footerHtml,
    gitRepoUrl,
    showGithub,
    baseUrl,
  } = props

  const [list] = useState(initialList)
  const [page, setPage] = useState(0)
  const [id, setId] = useState(0)
  const [query, setQuery] = useState('')
  const [login, setLogin] = useState(false)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({})
  const [contentKey, setContentKey] = useState('0-0-')

  const reducedMotion = useReducedMotion()
  const scrolled = useScrollY(120)

  useEffect(() => {
    setLogin(isLoggedIn())
    const params = new URLSearchParams(window.location.search)
    const p = Number(params.get('page') || 0)
    const i = Number(params.get('id') || 0)
    const q = params.get('q') || ''
    if (!Number.isNaN(p)) setPage(p)
    if (!Number.isNaN(i)) setId(i)
    if (q) setQuery(q)

    if ('ontouchstart' in window && !window.location.pathname.includes('/app')) {
      window.location.replace(`${baseUrl}app/${window.location.search}`)
    }
  }, [baseUrl])

  const syncUrl = (nextPage: number, nextId: number, q?: string) => {
    const params = new URLSearchParams()
    params.set('page', String(nextPage))
    params.set('id', String(nextId))
    if (q) params.set('q', q)
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
    setContentKey(`${nextPage}-${nextId}-${q || ''}`)
  }

  const topNav = useMemo(() => visibleNav(list, login), [list, login])
  const sideNav = useMemo(() => visibleNav(topNav[page]?.nav || [], login), [topNav, page, login])

  const sections: INavThreeProp[] = useMemo(() => {
    if (query.trim()) return fuzzySearch(list, query)
    const raw = matchCurrentList(list, page, id)
    return visibleNav(raw, login).map((sec) => ({
      ...sec,
      nav: visibleNav(sec.nav || [], login),
    }))
  }, [list, page, id, query, login])

  const total = totalWeb(list)
  const footer = footerHtml.replace('${total}', String(total))

  return (
    <div className={styles.page}>
      <header
        className={`${styles.hero} ${reducedMotion ? styles.heroStatic : ''}`}
        style={posterUrl ? { ['--hero-image' as string]: `url(${posterUrl})` } : undefined}
      >
        <nav className={styles.heroToolbar} aria-label="站点工具">
          <ThemeToggle className={styles.toolbarBtn} variant="icon" />
          {showGithub ? (
            <a
              className={`${styles.toolbarBtn} ${styles.toolbarText}`}
              href={gitRepoUrl}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          ) : null}
          <a className={`${styles.toolbarBtn} ${styles.toolbarText}`} href={`${baseUrl}admin/`}>
            管理
          </a>
        </nav>
        <div className={styles.heroMain}>
          <p
            className={`${styles.eyebrow} ${reducedMotion ? '' : styles.fadeUp}`}
            style={reducedMotion ? undefined : { animationDelay: '40ms' }}
          >
            Navigation · {total} sites
          </p>
          <h1
            className={`${styles.brand} ${reducedMotion ? '' : styles.fadeUp}`}
            style={reducedMotion ? undefined : { animationDelay: '120ms' }}
          >
            {title}
          </h1>
          <p
            className={`${styles.lead} ${reducedMotion ? '' : styles.fadeUp}`}
            style={reducedMotion ? undefined : { animationDelay: '200ms' }}
            dangerouslySetInnerHTML={{
              __html: descriptionHtml.replace('${total}', String(total)),
            }}
          />
          <div className={styles.searchSlot}>
            <SearchBar
              engines={searchEngines}
              tone="hero"
              onSiteSearch={(q) => {
                setQuery(q)
                syncUrl(page, id, q)
              }}
            />
          </div>
        </div>
      </header>

      <div className={`${styles.stickyBar} ${scrolled ? styles.stickyElevated : ''}`}>
        <nav className={styles.topNav} aria-label="一级分类">
          {topNav.map((item, i) => (
            <button
              key={item.title}
              type="button"
              className={i === page && !query ? styles.topActive : styles.topItem}
              onClick={() => {
                const nextId = item.id || 0
                setPage(i)
                setId(nextId)
                setQuery('')
                syncUrl(i, nextId)
              }}
            >
              {item.title}
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <p className={styles.sideLabel}>子分类</p>
          {sideNav.map((item, i) => (
            <button
              key={`${item.title}-${i}`}
              type="button"
              className={i === id && !query ? styles.sideActive : styles.sideItem}
              onClick={() => {
                setId(i)
                setQuery('')
                syncUrl(page, i)
              }}
            >
              {item.title}
            </button>
          ))}
        </aside>

        <main className={`${styles.main} ${styles.contentSwap}`} key={contentKey}>
          {query ? (
            <div className={styles.searchMeta}>
              <span>站内搜索「{query}」</span>
              <button type="button" onClick={() => { setQuery(''); syncUrl(page, id) }}>
                清除
              </button>
            </div>
          ) : null}

          {sections.length === 0 ? (
            <div className={styles.empty}>暂无内容</div>
          ) : (
            sections.map((section, sIdx) => {
              const key = `${page}-${id}-${section.title}-${sIdx}`
              const collapsed = collapsedMap[key]
              return (
                <AnimatedSection
                  key={key}
                  sectionKey={key}
                  section={section}
                  collapsed={!!collapsed}
                  reducedMotion={reducedMotion}
                  onToggle={() => setCollapsedMap((m) => ({ ...m, [key]: !m[key] }))}
                />
              )
            })
          )}
        </main>
      </div>

      <footer className={styles.footer} dangerouslySetInnerHTML={{ __html: footer }} />

      <div className={`${styles.dock} ${scrolled ? styles.dockVisible : ''}`}>
        <a href={`${baseUrl}app/`} title="移动版">App</a>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="回到顶部">
          ↑
        </button>
      </div>
    </div>
  )
}
