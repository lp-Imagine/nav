import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { INavProps, ISearchEngineProps } from '../../lib/types'
import { visibleNav } from '../../lib/data'
import { isLoggedIn } from '../../lib/github'
import { useReducedMotion, useScrollY } from '../../lib/motion'
import { useViewportRedirect } from '../../lib/viewport'
import SearchBar from './SearchBar'
import SiteIcon from './SiteIcon'
import BrandMark from './BrandMark'
import ThemeToggle from './ThemeToggle'
import styles from './AppView.module.css'

interface Props {
  websiteList: INavProps[]
  searchEngines: ISearchEngineProps[]
  title: string
  baseUrl: string
}

function categoryHue(title: string) {
  let h = 0
  for (let i = 0; i < title.length; i += 1) h = (h + title.charCodeAt(i) * 19) % 360
  return h
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor" opacity="0.35" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden>
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className={styles.toolIcon} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M10.33 4.1 9.5 6.45a4.5 4.5 0 0 0-2.38 1.38L4.77 7.1a1 1 0 0 0-1.27 1.27l.73 2.35a4.5 4.5 0 0 0 0 2.76l-.73 2.35a1 1 0 0 0 1.27 1.27l2.35-.73a4.5 4.5 0 0 0 2.38 1.38l.83 2.35a1 1 0 0 0 1.9 0l.83-2.35a4.5 4.5 0 0 0 2.38-1.38l2.35.73a1 1 0 0 0 1.27-1.27l-.73-2.35a4.5 4.5 0 0 0 0-2.76l.73-2.35a1 1 0 0 0-1.27-1.27l-2.35.73a4.5 4.5 0 0 0-2.38-1.38L13.67 4.1a1 1 0 0 0-1.9 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5v14M6 11l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg className={styles.externalIcon} viewBox="0 0 16 16" aria-hidden>
      <path d="M10 2h4v4M14 2 8 8M6 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AppView({ websiteList, searchEngines, title, baseUrl }: Props) {
  const [page, setPage] = useState(0)
  const [id, setId] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [login, setLogin] = useState(false)
  const [filter, setFilter] = useState('')
  const [contentKey, setContentKey] = useState('0-0')
  const [sheetQuery, setSheetQuery] = useState('')
  const [sheetPage, setSheetPage] = useState(0)
  const [sheetArmed, setSheetArmed] = useState(false)
  const sheetOpeningRef = useRef(false)

  const reducedMotion = useReducedMotion()
  const scrolled = useScrollY(48)

  useViewportRedirect('app', baseUrl)

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

  const openCategorySheet = useCallback(() => {
    if (sheetOpeningRef.current) return
    sheetOpeningRef.current = true
    window.setTimeout(() => {
      sheetOpeningRef.current = false
    }, 400)
    setSheetPage(page)
    setSheetOpen(true)
  }, [page])

  const closeCategorySheet = useCallback(() => {
    setSheetOpen(false)
    setSheetQuery('')
  }, [])

  useEffect(() => {
    if (!sheetOpen) {
      setSheetArmed(false)
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const armTimer = window.setTimeout(() => setSheetArmed(true), 80)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCategorySheet()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(armTimer)
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen, closeCategorySheet])

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
    return visibleNav(raw, login)
      .map((g) => ({
        ...g,
        nav: visibleNav(g.nav || [], login).filter((site) => {
          if (!filter.trim()) return true
          const q = filter.toLowerCase()
          return site.name.toLowerCase().includes(q) || (site.desc || '').toLowerCase().includes(q)
        }),
      }))
      .filter((g) => g.nav.length > 0 || !filter.trim())
  }, [side, id, login, filter])

  const resultCount = groups.reduce((n, g) => n + g.nav.length, 0)

  const filteredTop = useMemo(() => {
    const q = sheetQuery.trim().toLowerCase()
    if (!q) return top
    return top.filter((item) => item.title?.toLowerCase().includes(q))
  }, [top, sheetQuery])

  const pickCategory = (p: number, sideIdx: number) => {
    const item = top[p]
    if (!item) return
    setPage(p)
    setId(sideIdx)
    closeCategorySheet()
    sync(p, sideIdx)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={styles.page}>
      <header className={`${styles.hero} ${scrolled ? styles.heroCompact : ''}`}>
        <div className={styles.heroOrbA} aria-hidden />
        <div className={styles.heroOrbB} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.brandRow}>
            <div className={styles.brandCopy}>
              <p className={styles.brandEyebrow}>发现好站</p>
              <h1 className={styles.brandTitle}>
                <BrandMark baseUrl={baseUrl} size={28} className={styles.brandMark} />
                <span>{title}</span>
              </h1>
            </div>
            <div className={styles.toolGroup}>
              <ThemeToggle className={styles.toolBtn} variant="icon" />
              <a className={styles.toolBtn} href={`${baseUrl}admin/`} aria-label="管理后台">
                <SettingsIcon />
              </a>
            </div>
          </div>

        </div>
      </header>

      <div className={`${styles.stickyShell} ${scrolled ? styles.stickyShellElevated : ''}`}>
        <button
          type="button"
          className={styles.categoryBar}
          onClick={openCategorySheet}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-label="打开分类选择"
        >
          <span className={styles.categoryBarTag}>分类</span>
          <span className={styles.categoryBarPath}>
            {currentTop?.title || '选择分类'}
            {currentSide?.title ? ` · ${currentSide.title}` : ''}
          </span>
          <ChevronDown />
        </button>

        <div className={styles.searchZone}>
          <SearchBar
            engines={searchEngines}
            compact
            variant="app"
            onSiteSearch={(q) => {
              setFilter(q)
              sync(page, id, q)
            }}
          />
        </div>

        {side.length > 0 ? (
          <div className={styles.chipsWrap}>
            <div className={styles.chipsTrack}>
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
        ) : null}
      </div>

      {filter ? (
        <div className={styles.searchBanner}>
          <div>
            <p className={styles.searchBannerTitle}>站内搜索</p>
            <p className={styles.searchBannerMeta}>
              「{filter}」· 找到 {resultCount} 个结果
            </p>
          </div>
          <button
            type="button"
            className={styles.searchBannerClear}
            onClick={() => {
              setFilter('')
              sync(page, id, '')
            }}
          >
            清除
          </button>
        </div>
      ) : null}

      <main className={`${styles.main} ${reducedMotion ? '' : styles.mainEnter}`} key={contentKey}>
        {filter && resultCount === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden>🔍</div>
            <p className={styles.emptyTitle}>没有找到相关站点</p>
            <p className={styles.emptyHint}>试试换个关键词，或浏览其他分类</p>
            <button type="button" onClick={() => { setFilter(''); sync(page, id, '') }}>
              清除搜索
            </button>
          </div>
        ) : (
          groups.map((group, gIdx) => (
            <section
              key={group.title}
              className={styles.group}
              style={reducedMotion ? undefined : { animationDelay: `${gIdx * 50}ms` }}
            >
              <div className={styles.groupHead}>
                <h2>{group.title || '未命名'}</h2>
                <span>{group.nav.length}</span>
              </div>
              <div className={styles.panel}>
                {group.nav.map((site, idx) => (
                  <a
                    key={site.url + site.name}
                    className={styles.card}
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    style={reducedMotion ? undefined : { animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                  >
                    <SiteIcon name={site.name} icon={site.icon} url={site.url} size="lg" className={styles.siteIcon} />
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitleRow}>
                        <strong dangerouslySetInnerHTML={{ __html: site.name }} />
                        {site.top ? <span className={styles.featured}>推荐</span> : null}
                      </div>
                      {site.desc ? <p className={styles.cardDesc}>{site.desc}</p> : null}
                      {site.rate ? (
                        <p className={styles.rate}>{'★'.repeat(Math.round(site.rate))}</p>
                      ) : null}
                    </div>
                    <ExternalIcon />
                  </a>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <nav className={styles.fabBar} aria-label="快捷操作">
        <button type="button" className={styles.fabBtn} onClick={openCategorySheet}>
          <GridIcon />
          <span>分类</span>
        </button>
        <button
          type="button"
          className={`${styles.fabBtn} ${styles.fabBtnPrimary}`}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="回到顶部"
        >
          <ArrowUpIcon />
        </button>
      </nav>

      {sheetOpen ? (
            <div className={styles.sheetOverlay} role="presentation">
              <button
                type="button"
                className={styles.sheetBackdrop}
                aria-label="关闭分类选择"
                tabIndex={-1}
                onClick={() => {
                  if (sheetArmed) closeCategorySheet()
                }}
              />
              <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="选择分类">
                <div className={styles.sheetHandle} />
                <div className={styles.sheetHead}>
                  <div>
                    <h3>浏览分类</h3>
                    <p>先选一级分类，再选二级分类</p>
                  </div>
                  <button type="button" className={styles.sheetClose} onClick={closeCategorySheet}>
                    完成
                  </button>
                </div>
                <div className={styles.sheetSearch}>
                  <input
                    value={sheetQuery}
                    onChange={(e) => setSheetQuery(e.target.value)}
                    placeholder="搜索分类名称…"
                    aria-label="搜索分类"
                  />
                </div>
                <div className={styles.sheetList}>
                  {filteredTop.length === 0 ? (
                    <p className={styles.sheetEmpty}>没有匹配的分类</p>
                  ) : (
                    filteredTop.map((item) => {
                      const realIdx = top.findIndex((t) => t.title === item.title)
                      const expanded = sheetPage === realIdx
                      const hue = categoryHue(item.title || '')
                      const subs = visibleNav(top[realIdx]?.nav || [], login)
                      return (
                        <div key={item.title} className={styles.sheetGroup}>
                          <button
                            type="button"
                            className={expanded ? styles.sheetRowActive : styles.sheetRow}
                            onClick={() => setSheetPage(realIdx)}
                          >
                            <span
                              className={styles.sheetDot}
                              style={{ background: `hsl(${hue} 72% 58%)` }}
                              aria-hidden
                            />
                            <span className={styles.sheetRowText}>
                              <strong>{item.title}</strong>
                              <small>{subs.length} 个二级分类</small>
                            </span>
                            <span className={styles.sheetExpand} aria-hidden>{expanded ? '−' : '+'}</span>
                          </button>
                          {expanded && subs.length > 0 ? (
                            <div className={styles.sheetSubList}>
                              {subs.map((sub, si) => (
                                <button
                                  key={`${sub.title}-${si}`}
                                  type="button"
                                  className={page === realIdx && id === si ? styles.sheetSubActive : styles.sheetSub}
                                  onClick={() => pickCategory(realIdx, si)}
                                >
                                  <span>{sub.title}</span>
                                  <small>{sub.nav?.length || 0}</small>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
      ) : null}
    </div>
  )
}
