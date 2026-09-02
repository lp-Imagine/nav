import { useEffect } from 'react'

/** 与 SimView 响应式断点一致：≤960px 使用 App 移动布局 */
export const MOBILE_BREAKPOINT = 960

export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

export function preferredViewSegment(): 'app' | 'sim' {
  return isMobileViewport() ? 'app' : 'sim'
}

/** 视口变化时自动在 /sim 与 /app 间切换，保留查询参数 */
export function useViewportRedirect(view: 'sim' | 'app', baseUrl: string) {
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA_QUERY)

    const sync = () => {
      const mobile = mq.matches
      const search = window.location.search
      if (mobile && view === 'sim') {
        window.location.replace(`${baseUrl}app/${search}`)
      } else if (!mobile && view === 'app') {
        window.location.replace(`${baseUrl}sim/${search}`)
      }
    }

    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [view, baseUrl])
}
