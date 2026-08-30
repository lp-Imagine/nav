import type { INavProps, INavThreeProp, INavFourProp } from './types'
import db from '../../../data/db.json'
import search from '../../../data/search.json'
import tag from '../../../data/tag.json'
import type { ISearchEngineProps, ITagProp } from './types'

export const websiteList = db as INavProps[]
export const searchEngines = search as ISearchEngineProps[]
export const tagMap = tag as ITagProp

export function totalWeb(list: INavProps[] = websiteList): number {
  let count = 0
  const walk = (arr: unknown[]) => {
    for (const item of arr) {
      const node = item as { nav?: unknown[]; name?: string; url?: string }
      if (Array.isArray(node.nav)) walk(node.nav)
      if (node.name && node.url) count += 1
    }
  }
  walk(list)
  return count
}

export function flattenSites(list: INavProps[] = websiteList): INavFourProp[] {
  const result: INavFourProp[] = []
  const walk = (arr: unknown[]) => {
    for (const item of arr) {
      const node = item as { nav?: unknown[]; name?: string; url?: string }
      if (Array.isArray(node.nav)) walk(node.nav)
      if (node.name && node.url) result.push(node as INavFourProp)
    }
  }
  walk(list)
  return result
}

export function matchCurrentList(
  list: INavProps[],
  page: number,
  id: number,
): INavThreeProp[] {
  try {
    return list[page]?.nav?.[id]?.nav ?? []
  } catch {
    return []
  }
}

export function fuzzySearch(navList: INavProps[], keyword: string): INavThreeProp[] {
  const q = keyword.trim().toLowerCase()
  if (!q) return []

  const navData: INavFourProp[] = []
  const seen: Record<string, boolean> = {}

  const walk = (arr: unknown[]) => {
    for (const raw of arr) {
      if (navData.length > 50) break
      const item = raw as INavFourProp & { nav?: unknown[] }
      if (Array.isArray(item.nav)) walk(item.nav)
      if (!item.name) continue

      const name = item.name.toLowerCase()
      const desc = (item.desc || '').toLowerCase()
      const url = (item.url || '').toLowerCase()
      const urls = Object.values(item.urls || {})

      const hit =
        name.includes(q) ||
        desc.includes(q) ||
        url.includes(q) ||
        urls.some((u) => String(u).toLowerCase().includes(q))

      if (hit && item.url && !seen[item.url]) {
        seen[item.url] = true
        const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'i')
        navData.push({
          ...item,
          name: item.name.replace(regex, '<b>$1</b>'),
        })
      }
    }
  }

  walk(navList)
  return [{ title: `搜索「${keyword}」`, nav: navData, collapsed: false }]
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function visibleNav<T extends { ownVisible?: boolean }>(
  items: T[],
  isLogin: boolean,
): T[] {
  return items.filter((item) => isLogin || !item.ownVisible)
}
