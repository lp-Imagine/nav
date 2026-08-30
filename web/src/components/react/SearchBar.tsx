import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ISearchEngineProps } from '../../lib/types'
import { useReducedMotion } from '../../lib/motion'
import SiteIcon from './SiteIcon'
import styles from './SearchBar.module.css'

interface Props {
  engines: ISearchEngineProps[]
  onSiteSearch?: (q: string) => void
  compact?: boolean
  /** 深色 Hero 顶栏（App 移动端） */
  tone?: 'default' | 'hero'
}

export default function SearchBar({ engines, onSiteSearch, compact, tone = 'default' }: Props) {
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

  return (
    <form
      className={`${styles.form} ${compact ? styles.compact : ''} ${hero ? styles.hero : ''} ${motionClass}`}
      onSubmit={submit}
    >
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
      <div
        className={styles.field}
        style={motionClass ? { animationDelay: '320ms' } : undefined}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={engine?.placeholder || `搜索 ${engine?.name || ''}`}
          aria-label="搜索"
        />
        <button type="submit" className={styles.submit}>
          搜索
        </button>
      </div>
    </form>
  )
}
