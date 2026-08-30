import { useEffect, useState } from 'react'
import { toggleTheme } from './ThemeInit'
import styles from './chrome.module.css'

interface Props {
  className?: string
  variant?: 'text' | 'icon'
}

export default function ThemeToggle({ className, variant = 'text' }: Props) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  return (
    <button
      type="button"
      className={className ? `${styles.iconBtn} ${className}` : styles.iconBtn}
      aria-label={dark ? '切换浅色' : '切换深色'}
      onClick={() => {
        toggleTheme()
        setDark((v) => !v)
      }}
    >
      {variant === 'icon' ? (
        <span className={styles.glyph} aria-hidden>{dark ? '☀' : '☾'}</span>
      ) : (
        dark ? '浅色' : '深色'
      )}
    </button>
  )
}
