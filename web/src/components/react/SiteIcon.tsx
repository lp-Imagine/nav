import { useEffect, useRef, useState } from 'react'
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

function isImageReady(img: HTMLImageElement) {
  return img.complete && img.naturalWidth > 0
}

export default function SiteIcon({ name, icon, url = '', size = 'md', className }: Props) {
  const px = sizes[size]
  const candidates = iconCandidates(icon, url, px)
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const src = candidates[idx]
  const initial = siteInitial(name)

  useEffect(() => {
    setIdx(0)
    setLoaded(false)
  }, [icon, url])

  useEffect(() => {
    setLoaded(false)
  }, [src])

  // 图片已在缓存/SSR 阶段加载完成时，onLoad 不会再触发
  useEffect(() => {
    const img = imgRef.current
    if (!img || !src) return
    if (!img.complete) return
    if (img.naturalWidth > 0) setLoaded(true)
    else setIdx((i) => i + 1)
  }, [src, idx])

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

  return (
    <span className={`${styles.wrap} ${styles[size]} ${className || ''}`}>
      {!loaded ? (
        <span className={styles.placeholder} aria-hidden>
          {initial}
        </span>
      ) : null}
      <img
        key={src}
        ref={imgRef}
        src={src}
        alt=""
        width={px}
        height={px}
        loading={size === 'xs' || size === 'sm' ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        className={loaded ? styles.imgReady : styles.imgWait}
        onError={() => setIdx((i) => i + 1)}
        onLoad={(e) => {
          if (isImageReady(e.currentTarget)) setLoaded(true)
          else setIdx((i) => i + 1)
        }}
      />
    </span>
  )
}
