import { useEffect, useState } from 'react'
import { toggleTheme } from './ThemeInit'
import styles from './chrome.module.css'

interface Props {
  className?: string
  variant?: 'text' | 'icon'
}

function SunIcon() {
  return (
    <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.75v2.1M12 19.15v2.1M4.93 4.93l1.48 1.48M17.59 17.59l1.48 1.48M2.75 12h2.1M19.15 12h2.1M4.93 19.07l1.48-1.48M17.59 6.41l1.48-1.48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M20.5 14.2A8.2 8.2 0 1 1 9.8 3.5a6.4 6.4 0 0 0 10.7 10.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ThemeToggle({ className, variant = 'text' }: Props) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  const btnClass =
    variant === 'icon' && className
      ? className
      : className
        ? `${styles.iconBtn} ${className}`
        : styles.iconBtn

  return (
    <button
      type="button"
      className={btnClass}
      aria-label={dark ? '切换浅色' : '切换深色'}
      onClick={() => {
        toggleTheme()
        setDark((v) => !v)
      }}
    >
      {variant === 'icon' ? (
        dark ? <SunIcon /> : <MoonIcon />
      ) : (
        dark ? '浅色' : '深色'
      )}
    </button>
  )
}
