import { useEffect, useState } from 'react'
import { iconCandidates, siteInitial } from '../../lib/icon'
import styles from './SiteIcon.module.css'

interface Props {
  name: string
  icon?: string | null
  url?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { xs: 22, sm: 32, md: 40, lg: 48 }

export default function SiteIcon({ name, icon, url = '', size = 'md', className }: Props) {
  const px = sizes[size]
  const candidates = iconCandidates(icon, url, px)
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const src = candidates[idx]
  const initial = siteInitial(name)

  useEffect(() => {
    setIdx(0)
    setLoaded(false)
  }, [icon, url])

  useEffect(() => {
    setLoaded(false)
  }, [src])

  if (!src || idx >= candidates.length) {
    return (
      <span
        className={`${styles.fallback} ${styles[size]} ${className || ''}`}
        aria-hidden
      >
        {initial}
      </span>
    )
  }

  const advance = () => setIdx((i) => i + 1)

  return (
    <span className={`${styles.wrap} ${styles[size]} ${className || ''}`}>
      {!loaded ? (
        <span className={styles.placeholder} aria-hidden>
          {initial}
        </span>
      ) : null}
      <img
        key={src}
        src={src}
        alt=""
        width={px}
        height={px}
        loading={size === 'xs' || size === 'sm' ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        className={loaded ? styles.imgReady : styles.imgWait}
        onError={advance}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth === 0) {
            advance()
            return
          }
          setLoaded(true)
        }}
      />
    </span>
  )
}
