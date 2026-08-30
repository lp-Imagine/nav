import type { INavFourProp, INavProps, INavThreeProp, INavTwoProp } from './types'

export type AdminLevel = 'l1' | 'l2' | 'l3' | 'site'

export interface AdminPath {
  l1?: number
  l2?: number
  l3?: number
}

export function getL1(list: INavProps[], i?: number) {
  return i === undefined ? undefined : list[i]
}

export function getL2(l1: INavProps | undefined, i?: number): INavTwoProp | undefined {
  return i === undefined || !l1 ? undefined : l1.nav[i]
}

export function getL3(l2: INavTwoProp | undefined, i?: number): INavThreeProp | undefined {
  return i === undefined || !l2 ? undefined : l2.nav[i]
}

export function getSites(l3: INavThreeProp | undefined): INavFourProp[] {
  return l3?.nav || []
}

export function breadcrumb(list: INavProps[], path: AdminPath): string[] {
  const parts: string[] = []
  const l1 = getL1(list, path.l1)
  if (l1) parts.push(l1.title)
  const l2 = getL2(l1, path.l2)
  if (l2?.title) parts.push(l2.title)
  const l3 = getL3(l2, path.l3)
  if (l3?.title) parts.push(l3.title)
  return parts
}

export function countSites(list: INavProps[]): number {
  let n = 0
  const walk = (arr: unknown[]) => {
    for (const item of arr) {
      const node = item as { nav?: unknown[]; name?: string; url?: string }
      if (Array.isArray(node.nav)) walk(node.nav)
      if (node.name && node.url) n += 1
    }
  }
  walk(list)
  return n
}

export function countCategories(list: INavProps[]) {
  let l1 = list.length
  let l2 = 0
  let l3 = 0
  for (const one of list) {
    l2 += one.nav.length
    for (const two of one.nav) l3 += two.nav.length
  }
  return { l1, l2, l3 }
}

export const LOCAL_KEY = 'website'

export function loadLocalDraft(): INavProps[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    return JSON.parse(raw) as INavProps[]
  } catch {
    return null
  }
}

export function saveLocalDraft(list: INavProps[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

export function clearLocalDraft() {
  localStorage.removeItem(LOCAL_KEY)
}
