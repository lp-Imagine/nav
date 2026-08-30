import { useEffect, useMemo, useState } from 'react'
import type { INavProps, ISearchEngineProps } from '../../lib/types'
import { totalWeb, visibleNav } from '../../lib/data'
import { isLoggedIn } from '../../lib/github'
import { useReducedMotion, useScrollY } from '../../lib/motion'
import SearchBar from './SearchBar'
import SiteIcon from './SiteIcon'
import ThemeToggle from './ThemeToggle'
import styles from './AppView.module.css'

interface Props {
  websiteList: INavProps[]
  searchEngines: ISearchEngineProps[]
  title: string
  baseUrl: string
}

export default function AppView({ websiteList, searchEngines, title, baseUrl }: Props) {
  const [page, setPage] = useState(0)
  const [id, setId] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [login, setLogin] = useState(false)
  const [filter, setFilter] = useState('')
  const [contentKey, setContentKey] = useState('0-0')

  const reducedMotion = useReducedMotion()
  const scrolled = useScrollY(60)
  const total = totalWeb(websiteList)

  useEffect(() => {
    setLogin(isLoggedIn())
    const params = new URLSearchParams(window.location.search)
    const p = Number(params.get('page') || 0)
    const i = Number(params.get('id') || 0)
    const q = params.get('q') || ''
    if (!Number.isNaN(p)) setPage(p)
    if (!Number.isNaN(i)) setId(i)
    if (q) setFilter(q)
  }, [])

  const sync = (p: number, i: number, q = filter) => {
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('id', String(i))
    if (q.trim()) params.set('q', q.trim())
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
    setContentKey(`${p}-${i}-${q}`)
  }

  const top = useMemo(() => visibleNav(websiteList, login), [websiteList, login])
  const side = useMemo(() => visibleNav(top[page]?.nav || [], login), [top, page, login])
  const currentTop = top[page]
  const currentSide = side[id]

  const groups = useMemo(() => {
    const raw = side[id]?.nav || []
    return visibleNav(raw, login).map((g) => ({
      ...g,
      nav: visibleNav(g.nav || [], login).filter((site) => {
        if (!filter.trim()) return true
        const q = filter.toLowerCase()
        return site.name.toLowerCase().includes(q) || (site.desc || '').toLowerCase().includes(q)
      }),
    })).filter((g) => g.nav.length > 0 || !filter.trim())
  }, [side, id, login, filter])

  const resultCount = groups.reduce((n, g) => n + g.nav.length, 0)

  const showCrumb = filter.trim() || side.length === 0

  return (
    <div className={styles.page}>
      <div className={`${styles.stickyTop} ${scrolled ? styles.stickyTopCompact : ''}`}>
        <header className={styles.header}>
          <div className={styles.topRow}>
            <button type="button" className={styles.catPicker} onClick={() => setSheetOpen(true)}>
              <span className={styles.catMeta}>共 {total} 个站点</span>
              <span className={styles.catRow}>
                <strong>{currentTop?.title || '选择分类'}</strong>
                <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden>
                  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            <div className={styles.toolGroup}>
              <ThemeToggle className={styles.toolBtn} variant="icon" />
              <a className={styles.toolBtn} href={`${baseUrl}admin/`} aria-label="管理后台">
                <span className={styles.toolGlyph} aria-hidden>⚙</span>
              </a>
            </div>
          </div>
          <div className={styles.searchPanel}>
            <SearchBar
              engines={searchEngines}
              compact
              tone="hero"
              onSiteSearch={(q) => {
                setFilter(q)
                sync(page, id, q)
              }}
            />
          </div>
        </header>

        {side.length > 0 ? (
          <div className={styles.chipsWrap}>
            <div className={styles.chipsFade}>
              <div className={styles.chips}>
                {side.map((item, i) => (
                  <button
                    key={`${item.title}-${i}`}
                    type="button"
                    className={i === id ? styles.chipActive : styles.chip}
                    onClick={() => {
                      setId(i)
                      sync(page, i)
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showCrumb ? (
        <div className={styles.crumbBar}>
          <span>{currentTop?.title}</span>
          {currentSide?.title ? <span>›</span> : null}
          {currentSide?.title ? <span>{currentSide.title}</span> : null}
          {filter ? <span className={styles.filterTag}>「{filter}」</span> : null}
        </div>
      ) : null}

      <main className={`${styles.main} ${reducedMotion ? '' : styles.mainEnter}`} key={contentKey}>
        {filter && resultCount === 0 ? (
          <div className={styles.empty}>
            <p>没有找到「{filter}」相关站点</p>
            <button type="button" onClick={() => { setFilter(''); sync(page, id, '') }}>清除搜索</button>
          </div>
        ) : (
          groups.map((group, gIdx) => (
            <section key={group.title} className={styles.group} style={reducedMotion ? undefined : { animationDelay: `${gIdx * 60}ms` }}>
              <div className={styles.groupHead}>
                <h2>{group.title}</h2>
                <span>{group.nav.length}</span>
              </div>
              <div className={styles.list}>
                {group.nav.map((site, idx) => (
                  <a
                    key={site.url + site.name}
                    className={styles.card}
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    style={reducedMotion ? undefined : { animationDelay: `${Math.min(idx, 6) * 40}ms` }}
                  >
                    <SiteIcon name={site.name} icon={site.icon} url={site.url} size="md" />
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}>
                        <strong dangerouslySetInnerHTML={{ __html: site.name }} />
                        <span className={styles.arrow} aria-hidden>↗</span>
                      </div>
                      {site.desc ? <p>{site.desc}</p> : null}
                      {site.rate ? (
                        <p className={styles.rate}>{'★'.repeat(Math.round(site.rate))}</p>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <nav className={styles.bottomBar}>
        <button type="button" className={styles.bottomBtn} onClick={() => setSheetOpen(true)}>
          <span>分类</span>
          <small>{currentTop?.title || '—'}</small>
        </button>
        <a className={styles.bottomBtn} href={`${baseUrl}sim/`}>
          <span>桌面</span>
          <small>Sim 主题</small>
        </a>
        <button
          type="button"
          className={`${styles.bottomBtn} ${styles.topBtn}`}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span>顶部</span>
          <small>↑</small>
        </button>
      </nav>

      {sheetOpen ? (
        <div className={styles.sheetBackdrop} onClick={() => setSheetOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHead}>
              <h3>选择分类</h3>
              <button type="button" onClick={() => setSheetOpen(false)}>关闭</button>
            </div>
            <div className={styles.sheetGrid}>
              {top.map((item, i) => (
                <button
                  key={item.title}
                  type="button"
                  className={i === page ? styles.sheetActive : styles.sheetItem}
                  onClick={() => {
                    setPage(i)
                    setId(item.id || 0)
                    setSheetOpen(false)
                    sync(i, item.id || 0)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
