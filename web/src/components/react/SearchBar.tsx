import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ISearchEngineProps } from '../../lib/types'
import { useReducedMotion } from '../../lib/motion'
import SiteIcon from './SiteIcon'
import styles from './SearchBar.module.css'

interface Props {
  engines: ISearchEngineProps[]
  onSiteSearch?: (q: string) => void
  compact?: boolean
  /** 深色 Hero 顶栏（Sim 桌面） */
  tone?: 'default' | 'hero'
  /** 移动端 App 浅色卡片搜索 */
  variant?: 'default' | 'app'
}

export default function SearchBar({ engines, onSiteSearch, compact, tone = 'default', variant = 'default' }: Props) {
  const available = useMemo(() => engines.filter((e) => !e.blocked), [engines])
  const [engineIdx, setEngineIdx] = useState(0)
  const [q, setQ] = useState('')
  const [entering, setEntering] = useState(true)
  const reducedMotion = useReducedMotion()
  const engine = available[engineIdx] || available[0]

  useEffect(() => {
    if (reducedMotion || compact) {
      setEntering(false)
      return
    }
    const t = window.setTimeout(() => setEntering(false), 700)
    return () => window.clearTimeout(t)
  }, [reducedMotion, compact])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const keyword = q.trim()
    if (!keyword || !engine) return

    if (!engine.url) {
      onSiteSearch?.(keyword)
      return
    }
    window.open(engine.url + encodeURIComponent(keyword), '_blank', 'noopener,noreferrer')
  }

  const motionClass =
    reducedMotion || compact || !entering ? '' : styles.animateIn

  const hero = tone === 'hero'
  const isApp = variant === 'app'

  return (
    <form
      className={`${styles.form} ${compact ? styles.compact : ''} ${hero ? styles.hero : ''} ${isApp ? styles.app : ''} ${motionClass}`}
      onSubmit={submit}
    >
      {isApp ? (
        <div className={styles.appEngineDock} role="presentation">
          <div className={styles.engines} role="tablist" aria-label="搜索引擎">
            {available.map((item, i) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={i === engineIdx}
                aria-label={item.name}
                title={item.name}
                className={i === engineIdx ? styles.engineActive : styles.engine}
                onClick={() => setEngineIdx(i)}
              >
                {item.icon ? (
                  <SiteIcon
                    name={item.name}
                    icon={item.icon}
                    url={item.url || 'https://nav3.cn'}
                    size="xs"
                    className={i === engineIdx ? styles.appIconActive : styles.appIcon}
                  />
                ) : (
                  <span className={styles.appIconFallback}>{item.name.slice(0, 1)}</span>
                )}
              </button>
            ))}
          </div>
          {engine ? (
            <p className={styles.appEngineCaption}>
              使用 <strong>{engine.name}</strong> 搜索
            </p>
          ) : null}
        </div>
      ) : (
        <div className={hero ? (compact ? styles.enginesFade : styles.enginesTray) : undefined} role="presentation">
          <div className={styles.engines} role="tablist" aria-label="搜索引擎">
            {available.map((item, i) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={i === engineIdx}
                className={i === engineIdx ? styles.engineActive : styles.engine}
                style={
                  motionClass
                    ? { animationDelay: `${80 + Math.min(i, 8) * 45}ms` }
                    : undefined
                }
                onClick={() => setEngineIdx(i)}
              >
                {item.icon ? (
                  <SiteIcon
                    name={item.name}
                    icon={item.icon}
                    url={item.url || 'https://nav3.cn'}
                    size={hero ? 'xs' : 'sm'}
                    className={hero ? (i === engineIdx ? styles.engineSlotActive : styles.engineSlot) : undefined}
                  />
                ) : null}
                <span className={hero ? styles.engineLabel : undefined}>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        className={styles.field}
        style={motionClass ? { animationDelay: '320ms' } : undefined}
      >
        {isApp ? (
          <span className={styles.searchGlyph} aria-hidden>
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        ) : null}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={engine?.placeholder || `搜索 ${engine?.name || ''}`}
          aria-label="搜索"
        />
        <button type="submit" className={styles.submit}>
          {isApp ? (
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            '搜索'
          )}
        </button>
      </div>
    </form>
  )
}
