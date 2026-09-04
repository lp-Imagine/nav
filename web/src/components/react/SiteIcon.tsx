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
  const src = candidates[idx]

  useEffect(() => {
    setIdx(0)
  }, [icon, url])

  if (!src || idx >= candidates.length) {
    return (
      <span
        className={`${styles.fallback} ${styles[size]} ${className || ''}`}
        aria-hidden
      >
        {siteInitial(name)}
      </span>
    )
  }

  return (
    <span className={`${styles.wrap} ${styles[size]} ${className || ''}`}>
      <img
        key={src}
        src={src}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setIdx((i) => i + 1)}
      />
    </span>
  )
}
