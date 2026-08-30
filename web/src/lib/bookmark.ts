import type { INavProps } from './types'

function getCreatedAt(node?: Element): string {
  if (!node) return new Date().toISOString()
  const addDate = node.getAttribute('add_date')
  if (!addDate) return new Date().toISOString()
  return new Date(Number(addDate) * 1000).toISOString()
}

function getTitle(node: Element) {
  return node.textContent || ''
}

function getUrl(node: Element) {
  return node.getAttribute('href') || ''
}

function getIcon(node: Element) {
  return node.getAttribute('icon') || null
}

const nowCreatedAt = () => getCreatedAt()

function findAllNoCate(rootDL: Element) {
  const data = []
  for (let i = 0; i < rootDL.childElementCount; i++) {
    const iItem = rootDL.childNodes[i] as Element
    if (iItem && iItem.nodeName === 'DT') {
      const a = iItem.firstElementChild
      if (!a || a.nodeName !== 'A') continue
      data.push({
        name: getTitle(a),
        createdAt: getCreatedAt(a),
        icon: getIcon(a),
        url: getUrl(a),
        urls: {},
        desc: '',
        rate: 5,
      })
    }
  }
  return data
}

export function parseBookmark(htmlStr: string, websiteList: INavProps[]) {
  const copyWebList: INavProps[] = JSON.parse(JSON.stringify(websiteList))
  const data: INavProps[] = []
  const importEl = document.createElement('div')
  importEl.innerHTML = htmlStr
  const rootDL = importEl.querySelector('dl dl')
  if (!rootDL) return new Error('无法解析书签结构')

  let ii = 0
  let jj = 0
  let kk = 0
  const stamp = nowCreatedAt()

  try {
    for (let i = 0; i < rootDL.childElementCount; i++) {
      const iItem = rootDL.childNodes[i] as Element
      if (!(iItem && iItem.nodeName === 'DT')) continue
      const titleEl = iItem.querySelector('h3')
      if (!titleEl) continue

      ii++
      data.push({
        title: getTitle(titleEl),
        createdAt: getCreatedAt(titleEl),
        icon: null,
        nav: [],
      })

      jj = 0
      const DL = iItem.querySelector('dl')
      if (!DL) continue

      const allNoCateData = findAllNoCate(DL)
      if (allNoCateData.length > 0) {
        jj++
        data[ii - 1].nav.push({
          createdAt: stamp,
          title: '未分类',
          nav: [{ title: '未分类', nav: allNoCateData }],
        })
      }

      for (let j = 0; j < DL.childElementCount; j++) {
        const jItem = DL.childNodes[j] as Element
        if (!(jItem && jItem.nodeName === 'DT')) continue
        const t2 = jItem.querySelector('h3')
        if (!t2) continue
        jj++
        data[ii - 1].nav.push({
          title: getTitle(t2),
          createdAt: getCreatedAt(t2),
          icon: null,
          nav: [],
        })

        kk = 0
        const DL3 = jItem.querySelector('dl')
        if (!DL3) continue
        const noCate3 = findAllNoCate(DL3)
        if (noCate3.length > 0) {
          kk++
          data[ii - 1].nav[jj - 1].nav.push({
            createdAt: stamp,
            title: '未分类',
            nav: noCate3,
          })
        }

        for (let k = 0; k < DL3.childElementCount; k++) {
          const kItem = DL3.childNodes[k] as Element
          if (!(kItem && kItem.nodeName === 'DT')) continue
          const t3 = kItem.querySelector('h3')
          if (!t3) continue
          kk++
          data[ii - 1].nav[jj - 1].nav.push({
            title: getTitle(t3),
            createdAt: getCreatedAt(t3),
            nav: [],
            icon: null,
          })

          const DL4 = kItem.querySelector('dl')
          if (!DL4) continue
          for (let b = 0; b < DL4.childElementCount; b++) {
            const wItem = DL4.childNodes[b] as Element
            if (!(wItem && wItem.nodeName === 'DT')) continue
            const a = wItem.querySelector('a')
            if (!a) continue
            data[ii - 1].nav[jj - 1].nav[kk - 1].nav.push({
              name: getTitle(a),
              createdAt: getCreatedAt(a),
              url: getUrl(a),
              desc: '',
              urls: {},
              rate: 5,
              top: false,
              icon: getIcon(a),
            })
          }
        }
      }
    }

    const orphan = findAllNoCate(rootDL)
    if (orphan.length > 0) {
      data.push({
        title: '未分类',
        createdAt: stamp,
        nav: [
          {
            createdAt: stamp,
            title: '未分类',
            nav: [{ title: '未分类', nav: orphan }],
          },
        ],
      })
    }
  } catch (error) {
    return error as Error
  }

  function merge(incoming: any[], list: any[]) {
    for (const item of incoming) {
      const title = item.title || item.name
      const idx = list.findIndex((x) => (x.title || x.name) === title)
      if (idx !== -1) {
        if (Array.isArray(item.nav)) merge(item.nav, list[idx].nav)
      } else {
        list.push(item)
      }
    }
  }
  merge(data, copyWebList)
  return copyWebList
}
