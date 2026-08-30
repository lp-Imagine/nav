import { useEffect } from 'react'

const KEY = 'isDark'

export default function ThemeInit() {
  useEffect(() => {
    const dark = localStorage.getItem(KEY) === '1'
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [])
  return null
}

export function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') !== 'dark'
  document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  localStorage.setItem(KEY, next ? '1' : '0')
}
