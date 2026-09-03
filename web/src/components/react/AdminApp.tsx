import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { INavFourProp, INavProps } from '../../lib/types'
import type { AdminPath } from '../../lib/admin'
import {
  breadcrumb,
  clearLocalDraft,
  countCategories,
  countSites,
  getL1,
  getL2,
  getL3,
  getSites,
  loadLocalDraft,
  saveLocalDraft,
} from '../../lib/admin'
import {
  checkApiHealth,
  getApiSession,
  githubOAuthUrl,
  isApiMode,
  loginWithPassword,
  logoutApi,
  syncDbToServer,
  type ApiHealth,
} from '../../lib/api'
import {
  clearToken,
  DB_PATH,
  getToken,
  pollDeviceToken,
  setToken,
  startDeviceFlow,
  updateFileContent,
  verifyToken,
} from '../../lib/github'
import { parseBookmark } from '../../lib/bookmark'
import SiteIcon from './SiteIcon'
import BrandMark from './BrandMark'
import styles from './AdminApp.module.css'

interface Props {
  initialList: INavProps[]
  gitRepoUrl: string
  githubClientId?: string
  baseUrl: string
}

type EditKind = 'l1' | 'l2' | 'l3' | 'site' | null

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 4v10M8 10l4 4 4-4M5 20h14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SortRow({
  id,
  title,
  subtitle,
  icon,
  url,
  onEdit,
  onDelete,
  onNavigate,
  dragDisabled,
}: {
  id: string
  title: string
  subtitle?: string
  icon?: string | null
  url?: string
  onEdit: () => void
  onDelete: () => void
  onNavigate?: () => void
  dragDisabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled: dragDisabled })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className={styles.row}>
      {!dragDisabled ? (
        <button type="button" className={styles.drag} {...attributes} {...listeners} aria-label="拖拽排序">
          ⋮⋮
        </button>
      ) : null}
      <div className={styles.rowMain}>
        {icon !== undefined || url ? (
          <SiteIcon name={title} icon={icon} url={url || ''} size="sm" />
        ) : null}
        {onNavigate ? (
          <button type="button" className={styles.rowTextBtn} onClick={onNavigate}>
            <strong>{title}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </button>
        ) : (
          <div className={styles.rowText}>
            <strong>{title}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
        )}
      </div>
      {!dragDisabled ? (
        <div className={styles.rowActions}>
          <button type="button" className={styles.iconBtn} onClick={onEdit} aria-label="编辑" title="编辑">
            <EditIcon />
          </button>
          <button type="button" className={`${styles.iconBtn} ${styles.danger}`} onClick={onDelete} aria-label="删除" title="删除">
            <TrashIcon />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function AdminApp({ initialList, gitRepoUrl, githubClientId, baseUrl }: Props) {
  const [baseline] = useState(() => JSON.stringify(initialList))
  const [list, setList] = useState<INavProps[]>(initialList)
  const [path, setPath] = useState<AdminPath>({ l1: 0 })
  const [treeQuery, setTreeQuery] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [useApi, setUseApi] = useState(false)
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null)
  const [sessionUser, setSessionUser] = useState('')
  const [authTab, setAuthTab] = useState<'password' | 'device' | 'token'>(githubClientId ? 'device' : 'token')
  const [deviceFlow, setDeviceFlow] = useState<{ user_code: string; verification_uri: string; device_code: string; interval: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [treeOpen, setTreeOpen] = useState(false)
  const [editKind, setEditKind] = useState<EditKind>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [catForm, setCatForm] = useState({ title: '', icon: '', ownVisible: false })
  const [webForm, setWebForm] = useState<INavFourProp>({
    name: '', desc: '', url: '', icon: '', rate: 5, urls: {},
  })
  const [formError, setFormError] = useState('')
  const [formInvalid, setFormInvalid] = useState<Record<string, boolean>>({})
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    danger?: boolean
    resolve: (ok: boolean) => void
  } | null>(null)

  const clearFormFeedback = useCallback(() => {
    setFormError('')
    setFormInvalid({})
  }, [])

  const closeEditor = useCallback(() => {
    setEditKind(null)
    clearFormFeedback()
  }, [clearFormFeedback])

  const askConfirm = useCallback((opts: {
    title: string
    message: string
    confirmLabel?: string
    danger?: boolean
  }) => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel || '确定',
        danger: opts.danger,
        resolve,
      })
    })
  }, [])

  const closeConfirm = useCallback((ok: boolean) => {
    setConfirmDialog((current) => {
      current?.resolve(ok)
      return null
    })
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const canEdit = loggedIn
  const dirty = canEdit && JSON.stringify(list) !== baseline
  const cats = countCategories(list)

  const l1 = getL1(list, path.l1)
  const l2 = path.l2 !== undefined ? getL2(l1, path.l2) : undefined
  const l3 = path.l3 !== undefined ? getL3(l2, path.l3) : undefined
  const sites = getSites(l3)
  const crumbs = breadcrumb(list, path)

  const panelKind: EditKind =
    path.l3 !== undefined && l3 ? 'site'
      : path.l2 !== undefined && l2 ? 'l3'
        : 'l2'

  const closeTreePanel = useCallback(() => {
    setTreeOpen(false)
  }, [])

  const openTreePanel = useCallback(() => {
    setTreeOpen(true)
  }, [])

  useEffect(() => {
    if (!treeOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTreePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [treeOpen, closeTreePanel])

  useEffect(() => {
    if (!confirmDialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmDialog, closeConfirm])

  useEffect(() => {
    checkApiHealth().then(async (health) => {
      setApiHealth(health)
      const api = isApiMode(health)
      setUseApi(api)

      if (api) {
        try {
          const session = await getApiSession()
          if (session.loggedIn) {
            setLoggedIn(true)
            setSessionUser(session.user || 'admin')
            const draft = loadLocalDraft()
            if (draft) setList(draft)
          }
        } catch {
          /* ignore */
        }
        const params = new URLSearchParams(window.location.search)
        if (params.get('login') === 'ok') {
          setLoggedIn(true)
          const draft = loadLocalDraft()
          if (draft) setList(draft)
          setMsg('GitHub 授权成功')
          window.history.replaceState(null, '', window.location.pathname)
        }
        return
      }

      const t = getToken()
      if (t) {
        setLoggedIn(true)
        setTokenInput(t)
        const draft = loadLocalDraft()
        if (draft) setList(draft)
      }
    })
  }, [])

  const notify = (text: string) => {
    setMsg(text)
    window.setTimeout(() => setMsg(''), 3500)
  }

  const requireEdit = () => {
    if (!loggedIn) {
      notify('请先登录后再编辑')
      return false
    }
    return true
  }

  const persist = useCallback((next: INavProps[]) => {
    if (!loggedIn) return
    setList(next)
    saveLocalDraft(next)
  }, [loggedIn])

  const loginWithPasswordApi = async () => {
    setBusy(true)
    try {
      await loginWithPassword(passwordInput)
      setLoggedIn(true)
      setSessionUser('admin')
      setPasswordInput('')
      const draft = loadLocalDraft()
      if (draft) setList(draft)
      notify('登录成功')
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const loginWithToken = async () => {
    setBusy(true)
    try {
      await verifyToken(tokenInput.trim())
      setToken(tokenInput.trim())
      setLoggedIn(true)
      setDeviceFlow(null)
      const draft = loadLocalDraft()
      if (draft) setList(draft)
      notify('登录成功')
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const startDeviceLogin = async () => {
    if (!githubClientId) return notify('请先在 config 中配置 githubClientId')
    setBusy(true)
    try {
      const flow = await startDeviceFlow(githubClientId)
      setDeviceFlow(flow)
      notify('请在 GitHub 页面输入设备码完成授权')
      pollDevice(flow.device_code, flow.interval)
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const pollDevice = async (deviceCode: string, interval: number) => {
    if (!githubClientId) return
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => window.setTimeout(r, interval * 1000))
      const res = await pollDeviceToken(githubClientId, deviceCode)
      if (res.access_token) {
        await verifyToken(res.access_token)
        setToken(res.access_token)
        setTokenInput(res.access_token)
        setLoggedIn(true)
        setDeviceFlow(null)
        const draft = loadLocalDraft()
        if (draft) setList(draft)
        notify('GitHub 授权成功')
        return
      }
      if (res.error && res.error !== 'authorization_pending') {
        notify(res.error_description || res.error)
        setDeviceFlow(null)
        return
      }
    }
    notify('授权超时，请重试')
    setDeviceFlow(null)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'db.json'
    a.click()
    URL.revokeObjectURL(a.href)
    notify('已导出 db.json')
  }

  const importJson = async (file: File) => {
    if (!requireEdit()) return
    try {
      const parsed = JSON.parse(await file.text()) as INavProps[]
      if (!Array.isArray(parsed)) throw new Error('格式错误')
      persist(parsed)
      notify('JSON 导入成功')
    } catch (e) {
      notify((e as Error).message || '导入失败')
    }
  }

  const requireLoginForSync = () => {
    if (!loggedIn) {
      notify('同步到 GitHub 需要先登录')
      return false
    }
    return true
  }

  const syncRemote = async () => {
    if (!requireLoginForSync()) return
    const ok = await askConfirm({
      title: '同步到 GitHub',
      message: '将把当前本地数据写入仓库。CI 构建完成后前台才会更新。',
      confirmLabel: '同步',
    })
    if (!ok) return
    setBusy(true)
    try {
      if (useApi) {
        await syncDbToServer(list)
      } else {
        await updateFileContent({
          message: 'update db',
          content: JSON.stringify(list, null, 2),
          path: DB_PATH,
        })
      }
      clearLocalDraft()
      notify('同步成功，等待 CI 构建后前台生效')
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    if (useApi) {
      try {
        await logoutApi()
      } catch {
        /* ignore */
      }
    } else {
      clearToken()
    }
    setLoggedIn(false)
    setSessionUser('')
    setDeviceFlow(null)
    clearLocalDraft()
    setList(JSON.parse(baseline) as INavProps[])
    notify('已退出')
  }

  const resetLocal = async () => {
    if (!requireEdit()) return
    const ok = await askConfirm({
      title: '放弃修改',
      message: '将丢弃本地未同步的修改，恢复为当前构建数据。此操作不可撤销。',
      confirmLabel: '放弃修改',
      danger: true,
    })
    if (!ok) return
    persist(JSON.parse(baseline) as INavProps[])
    notify('已恢复初始数据')
  }

  const openCatEditor = (kind: EditKind, idx: number | null, preset?: { title?: string; icon?: string | null; ownVisible?: boolean }) => {
    if (!requireEdit()) return
    clearFormFeedback()
    setEditKind(kind)
    setEditIdx(idx)
    setCatForm({
      title: preset?.title || '',
      icon: preset?.icon || '',
      ownVisible: !!preset?.ownVisible,
    })
  }

  const openSiteEditor = (idx: number | null, preset?: INavFourProp) => {
    if (!requireEdit()) return
    clearFormFeedback()
    setEditKind('site')
    setEditIdx(idx)
    setWebForm(preset || { name: '', desc: '', url: '', icon: '', rate: 5, urls: {} })
  }

  const saveCategory = () => {
    if (!requireEdit()) return
    const title = catForm.title.trim()
    if (!title) {
      setFormInvalid({ title: true })
      setFormError('请填写分类标题')
      return
    }
    const next = structuredClone(list)

    if (editKind === 'l1') {
      if (editIdx === null) {
        if (next.some((x) => x.title === title)) {
          setFormInvalid({ title: true })
          setFormError('一级分类已存在')
          return
        }
        next.unshift({ title, icon: catForm.icon || null, ownVisible: catForm.ownVisible, createdAt: new Date().toISOString(), nav: [] })
        setPath({ l1: 0 })
      } else {
        next[editIdx].title = title
        next[editIdx].icon = catForm.icon || null
        next[editIdx].ownVisible = catForm.ownVisible
      }
    } else if (editKind === 'l2') {
      const one = getL1(next, path.l1)
      if (!one) {
        setFormError('请选择一级分类')
        return
      }
      if (editIdx === null) {
        if (one.nav.some((x) => x.title === title)) {
          setFormInvalid({ title: true })
          setFormError('二级分类已存在')
          return
        }
        one.nav.unshift({ title, icon: catForm.icon || null, ownVisible: catForm.ownVisible, createdAt: new Date().toISOString(), nav: [] })
        setPath((p) => ({ l1: p.l1, l2: 0 }))
      } else {
        one.nav[editIdx].title = title
        one.nav[editIdx].icon = catForm.icon || null
        one.nav[editIdx].ownVisible = catForm.ownVisible
      }
    } else if (editKind === 'l3') {
      const one = getL1(next, path.l1)
      const two = getL2(one, path.l2)
      if (!two) {
        setFormError('请选择二级分类')
        return
      }
      if (editIdx === null) {
        if (two.nav.some((x) => x.title === title)) {
          setFormInvalid({ title: true })
          setFormError('三级分类已存在')
          return
        }
        two.nav.unshift({ title, icon: catForm.icon || null, ownVisible: catForm.ownVisible, createdAt: new Date().toISOString(), nav: [] })
        setPath((p) => ({ l1: p.l1, l2: p.l2, l3: 0 }))
      } else {
        two.nav[editIdx].title = title
        two.nav[editIdx].icon = catForm.icon || null
        two.nav[editIdx].ownVisible = catForm.ownVisible
      }
    }

    persist(next)
    closeEditor()
    notify(editIdx === null ? '已新增' : '已保存')
  }

  const saveSite = () => {
    if (!requireEdit()) return
    const nameEmpty = !webForm.name.trim()
    const urlEmpty = !webForm.url.trim()
    if (nameEmpty || urlEmpty) {
      setFormInvalid({ name: nameEmpty, url: urlEmpty })
      setFormError(nameEmpty && urlEmpty ? '名称和 URL 必填' : nameEmpty ? '请填写名称' : '请填写 URL')
      return
    }
    const next = structuredClone(list)
    const three = getL3(getL2(getL1(next, path.l1), path.l2), path.l3)
    if (!three) {
      setFormError('请先选择三级分类')
      return
    }

    if (editIdx === null) {
      three.nav.unshift({ ...webForm, createdAt: new Date().toISOString() })
    } else {
      three.nav[editIdx] = { ...three.nav[editIdx], ...webForm }
    }
    persist(next)
    closeEditor()
    notify('网站已保存')
  }

  const deleteItem = async (kind: EditKind, idx: number) => {
    if (!requireEdit()) return
    const ok = await askConfirm({
      title: '确认删除',
      message: '删除后仅影响本地草稿，同步到 GitHub 前仍可「放弃修改」恢复。',
      confirmLabel: '删除',
      danger: true,
    })
    if (!ok) return
    const next = structuredClone(list)
    if (kind === 'l1') {
      next.splice(idx, 1)
      setPath({ l1: 0 })
    } else if (kind === 'l2') {
      getL1(next, path.l1)?.nav.splice(idx, 1)
      setPath((p) => ({ l1: p.l1! }))
    } else if (kind === 'l3') {
      getL2(getL1(next, path.l1), path.l2)?.nav.splice(idx, 1)
      setPath((p) => ({ l1: p.l1!, l2: p.l2! }))
    } else if (kind === 'site') {
      getL3(getL2(getL1(next, path.l1), path.l2), path.l3)?.nav.splice(idx, 1)
    }
    persist(next)
    notify('已删除')
  }

  const onDragEnd = (event: DragEndEvent, kind: EditKind) => {
    if (!requireEdit()) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const next = structuredClone(list)

    const reorder = <T,>(arr: T[], idFn: (item: T, i: number) => string) => {
      const oldIndex = arr.findIndex((item, i) => idFn(item, i) === String(active.id))
      const newIndex = arr.findIndex((item, i) => idFn(item, i) === String(over.id))
      if (oldIndex < 0 || newIndex < 0) return arr
      return arrayMove(arr, oldIndex, newIndex)
    }

    if (kind === 'l1') {
      persist(reorder(next, (x, i) => `l1-${i}-${x.title}`))
    } else if (kind === 'l2') {
      const one = getL1(next, path.l1)
      if (!one) return
      one.nav = reorder(one.nav, (x, i) => `l2-${i}-${x.title}`)
      persist(next)
    } else if (kind === 'l3') {
      const two = getL2(getL1(next, path.l1), path.l2)
      if (!two) return
      two.nav = reorder(two.nav, (x, i) => `l3-${i}-${x.title}`)
      persist(next)
    } else if (kind === 'site') {
      const three = getL3(getL2(getL1(next, path.l1), path.l2), path.l3)
      if (!three) return
      three.nav = reorder(three.nav, (x, i) => `site-${i}-${x.url}`)
      persist(next)
    }
  }

  const onImportBookmark = async (file: File) => {
    if (!requireEdit()) return
    const html = await file.text()
    const result = parseBookmark(html, list)
    if (!Array.isArray(result)) {
      notify(`导入失败: ${(result as Error)?.message || '解析错误'}`)
      return
    }
    persist(result)
    notify('书签导入成功')
  }

  const filteredTree = useMemo(() => {
    const q = treeQuery.trim().toLowerCase()
    const fullTree = list.map((one, i1) => ({
      item: one,
      i1,
      nav2: one.nav.map((two, i2) => ({
        item: two,
        i2,
        nav3: two.nav.map((three, i3) => ({ item: three, i3 })),
      })),
    }))

    if (!q) return fullTree

    return fullTree
      .map((one) => {
        const l1Hit = one.item.title.toLowerCase().includes(q)
        const nav2 = one.nav2
          .map((two) => {
            const l2Hit = (two.item.title || '').toLowerCase().includes(q)
            const nav3 = two.nav3
              .map((three) => {
                const l3Hit = (three.item.title || '').toLowerCase().includes(q)
                const siteHit = three.item.nav.some(
                  (s) => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q),
                )
                if (l3Hit || siteHit) return three
                return null
              })
              .filter(Boolean) as typeof two.nav3
            if (l2Hit || nav3.length) return { ...two, nav3 }
            return null
          })
          .filter(Boolean) as typeof one.nav2
        if (l1Hit || nav2.length) return { ...one, nav2 }
        return null
      })
      .filter(Boolean) as {
      item: INavProps
      i1: number
      nav2: { item: INavProps['nav'][0]; i2: number; nav3: { item: INavProps['nav'][0]['nav'][0]; i3: number }[] }[]
    }[]
  }, [list, treeQuery])

  const selectPath = (next: AdminPath) => {
    setPath(next)
    closeTreePanel()
  }

  const categoryTree = (
    <>
      <div className={styles.treeHead}>
        <strong>分类树</strong>
        <div className={styles.treeHeadActions}>
          {canEdit ? (
            <button type="button" onClick={() => openCatEditor('l1', null)}>+ 一级</button>
          ) : null}
          <button type="button" className={styles.treeClose} onClick={closeTreePanel} aria-label="关闭">
            ✕
          </button>
        </div>
      </div>
      <input
        className={styles.treeSearch}
        value={treeQuery}
        onChange={(e) => setTreeQuery(e.target.value)}
        placeholder="搜索分类或网站…"
      />
      <div className={styles.treeBody}>
        {filteredTree.map(({ item: one, i1, nav2 }) => (
          <div key={`${one.title}-${i1}`} className={styles.treeBlock}>
            <button
              type="button"
              className={path.l1 === i1 && path.l2 === undefined ? styles.treeActive : styles.treeBtn}
              onClick={() => selectPath({ l1: i1 })}
            >
              {one.title}
            </button>
            {nav2.map(({ item: two, i2, nav3 }) => (
              <div key={`${two.title}-${i2}`} className={styles.treeSub}>
                <button
                  type="button"
                  className={path.l1 === i1 && path.l2 === i2 && path.l3 === undefined ? styles.treeActive : styles.treeBtn}
                  onClick={() => selectPath({ l1: i1, l2: i2 })}
                >
                  {two.title}
                </button>
                {nav3.map(({ item: three, i3 }) => (
                  <button
                    key={`${three.title}-${i3}`}
                    type="button"
                    className={path.l1 === i1 && path.l2 === i2 && path.l3 === i3 ? styles.treeLeafActive : styles.treeLeaf}
                    onClick={() => selectPath({ l1: i1, l2: i2, l3: i3 })}
                  >
                    {three.title}
                    <span>{three.nav?.length || 0}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )

  const panelRows =
    panelKind === 'site'
      ? sites.map((s, i) => ({ id: `site-${i}-${s.url}`, title: s.name, subtitle: s.url, icon: s.icon, url: s.url, idx: i }))
      : panelKind === 'l3'
        ? (l2?.nav || []).map((x, i) => ({ id: `l3-${i}-${x.title}`, title: x.title || '未命名', subtitle: `${x.nav?.length || 0} 个网站`, idx: i }))
        : (l1?.nav || []).map((x, i) => ({ id: `l2-${i}-${x.title}`, title: x.title || '未命名', subtitle: `${x.nav?.length || 0} 组`, idx: i }))

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroBrand}>
            <p className={styles.kicker}>Console</p>
            <h1>
              <BrandMark baseUrl={baseUrl} size={30} className={styles.brandMark} />
              <span>导航管理</span>
            </h1>
          </div>
          <div className={styles.heroActions}>
            {canEdit ? (
              <button type="button" className={styles.heroActionBtn} onClick={exportJson} title="导出 db.json">
                <ExportIcon />
                <span>导出</span>
              </button>
            ) : null}
            <a className={styles.heroActionBtn} href={`${baseUrl}sim/`}>
              <ArrowLeftIcon />
              <span>前台</span>
            </a>
          </div>
        </div>
        <p className={styles.heroSub}>登录后可编辑分类与网站，并同步到 GitHub 仓库</p>
      </header>

      <section className={styles.stats}>
        <div className={`${styles.stat} ${styles.statSites}`}>
          <strong>{countSites(list)}</strong>
          <span>网站总数</span>
        </div>
        <div className={`${styles.stat} ${styles.statL1}`}>
          <strong>{cats.l1}</strong>
          <span>一级分类</span>
        </div>
        <div className={`${styles.stat} ${styles.statL2}`}>
          <strong>{cats.l2}</strong>
          <span>二级分类</span>
        </div>
        <div className={`${styles.stat} ${dirty ? styles.statWarn : styles.statOk}`}>
          <strong>{dirty ? '待同步' : '已一致'}</strong>
          <span>{dirty ? '有本地未发布修改' : '与构建数据一致'}</span>
        </div>
      </section>

      <section className={styles.authCard}>
        <div className={styles.authHead}>
          <div>
            <h2>{loggedIn ? (useApi ? `已登录 · ${sessionUser}` : '已连接 GitHub') : '登录后开始编辑'}</h2>
            <p>
              {loggedIn
                ? useApi
                  ? '通过服务端安全同步，GitHub Token 不会暴露给浏览器'
                  : '可编辑数据并同步到仓库，或导出 JSON 手动提交'
                : useApi
                  ? '输入管理员密码或使用 GitHub 授权后即可编辑'
                  : '使用 GitHub 授权或 Token 登录后即可编辑与同步'}
            </p>
          </div>
          {loggedIn ? (
            <span className={styles.badge}>{useApi ? '服务端会话' : '已登录'}</span>
          ) : (
            <span className={styles.badgeMuted}>{useApi ? '只读浏览' : '只读浏览'}</span>
          )}
        </div>

        {!loggedIn ? (
          <div className={styles.loginPanel}>
          {useApi ? (
            <>
              {apiHealth?.password ? (
                <div className={styles.loginRow}>
                  <input
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="管理员密码"
                    type="password"
                    autoComplete="current-password"
                  />
                  <button type="button" className={styles.primary} disabled={busy || !passwordInput} onClick={loginWithPasswordApi}>
                    登录
                  </button>
                </div>
              ) : null}
              {apiHealth?.oauth ? (
                <div className={styles.actionRow}>
                  <a className={`${styles.primary} ${styles.oauthBtn}`} href={githubOAuthUrl()}>
                    GitHub 授权登录
                  </a>
                </div>
              ) : null}
            </>
          ) : (
          <>
            <div className={styles.authTabs}>
              {githubClientId ? (
                <button
                  type="button"
                  className={authTab === 'device' ? styles.authTabActive : styles.authTab}
                  onClick={() => setAuthTab('device')}
                >
                  设备码登录
                </button>
              ) : null}
              <button
                type="button"
                className={authTab === 'token' ? styles.authTabActive : styles.authTab}
                onClick={() => setAuthTab('token')}
              >
                Token 登录
              </button>
            </div>

            {authTab === 'device' && githubClientId ? (
              <div className={styles.deviceBox}>
                {deviceFlow ? (
                  <>
                    <div className={styles.deviceCode}>
                      <strong>{deviceFlow.user_code}</strong>
                      <a href={deviceFlow.verification_uri} target="_blank" rel="noreferrer" className={styles.primary}>
                        在 GitHub 授权
                      </a>
                    </div>
                    <p className={styles.deviceHint}>
                      打开 GitHub 授权页，输入上方设备码完成登录。比手动复制 Token 更安全，推荐日常使用。
                    </p>
                  </>
                ) : (
                  <>
                    <button type="button" className={styles.primary} disabled={busy} onClick={startDeviceLogin}>
                      获取 GitHub 设备码
                    </button>
                    <p className={styles.deviceHint}>
                      使用 OAuth 设备流授权，无需手动创建 Personal Access Token。
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className={styles.loginRow}>
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="GitHub Personal Access Token（仅保存在本机）"
                  type="password"
                  autoComplete="off"
                />
                <button type="button" className={styles.primary} disabled={busy || !tokenInput.trim()} onClick={loginWithToken}>
                  登录
                </button>
              </div>
            )}
          </>
          )}
          </div>
        ) : (
          <div className={styles.actionRow}>
            <button type="button" className={styles.primary} disabled={busy || !dirty} onClick={syncRemote}>
              同步到 GitHub
            </button>
            <div className={styles.actionGroup}>
              <button type="button" disabled={!dirty} onClick={resetLocal}>放弃修改</button>
              <label className={styles.fileBtn}>
                导入书签
                <input type="file" accept=".html,text/html" hidden onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImportBookmark(f)
                  e.target.value = ''
                }} />
              </label>
              <label className={styles.fileBtn}>
                导入 JSON
                <input type="file" accept=".json,application/json" hidden onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importJson(f)
                  e.target.value = ''
                }} />
              </label>
              <button type="button" onClick={handleLogout}>退出</button>
            </div>
          </div>
        )}

        {msg ? <p className={styles.toast}>{msg}</p> : null}
        <p className={styles.hint}>
          仓库：<a href={gitRepoUrl} target="_blank" rel="noreferrer">{gitRepoUrl}</a>
          {useApi
            ? ' · 服务端代理模式（Token 保存在服务器）'
            : githubClientId
              ? ' · 已启用设备码登录'
              : ' · 直连 GitHub API（Token 存本机）'}
        </p>
      </section>

      <div className={styles.layout}>
        <aside className={styles.tree}>
          {categoryTree}
        </aside>

        <main className={styles.panel}>
          <button
            type="button"
            className={styles.mobileBar}
            onClick={openTreePanel}
            aria-haspopup="dialog"
            aria-expanded={treeOpen}
            aria-label="打开分类树"
          >
            <span className={styles.treeToggle}>分类</span>
            <span className={styles.mobileCrumb}>{crumbs.join(' / ') || '选择分类'}</span>
            <span className={styles.mobileChevron} aria-hidden>›</span>
          </button>
          {!canEdit ? (
            <p className={styles.readOnlyHint}>只读模式：可浏览与切换分类，登录后显示编辑操作</p>
          ) : null}
          <div className={styles.panelHead}>
            <div>
              <p className={styles.crumb}>{crumbs.join(' / ') || '请选择左侧分类'}</p>
              <h2>
                {panelKind === 'site' ? `网站列表 (${sites.length})` : panelKind === 'l3' ? '三级分类' : '二级分类'}
              </h2>
            </div>
            {canEdit ? (
              <div className={styles.panelActions}>
                {panelKind === 'site' ? (
                  <button type="button" className={styles.primary} disabled={!l3} onClick={() => openSiteEditor(null)}>
                    新增网站
                  </button>
                ) : panelKind === 'l3' ? (
                  <>
                    <button type="button" disabled={!l2} onClick={() => openCatEditor('l3', null)}>新增三级</button>
                    {path.l2 !== undefined && l2 ? (
                      <button type="button" onClick={() => openCatEditor('l2', path.l2!, { title: l2.title, icon: l2.icon, ownVisible: l2.ownVisible })}>
                        <span className={styles.btnLabelLong}>编辑当前二级</span>
                        <span className={styles.btnLabelShort}>编辑二级</span>
                      </button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <button type="button" disabled={!l1} onClick={() => openCatEditor('l2', null)}>新增二级</button>
                    {path.l1 !== undefined && l1 ? (
                      <button type="button" onClick={() => openCatEditor('l1', path.l1!, { title: l1.title, icon: l1.icon, ownVisible: l1.ownVisible })}>
                        <span className={styles.btnLabelLong}>编辑当前一级</span>
                        <span className={styles.btnLabelShort}>编辑一级</span>
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd(e, panelKind === 'site' ? 'site' : panelKind)}>
            <SortableContext items={panelRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className={styles.list}>
                {panelRows.map((row) => (
                  <SortRow
                    key={row.id}
                    id={row.id}
                    title={row.title}
                    subtitle={row.subtitle}
                    icon={'icon' in row ? row.icon : undefined}
                    url={'url' in row ? row.url : undefined}
                    dragDisabled={!canEdit}
                    onNavigate={
                      panelKind === 'l2' && path.l1 !== undefined
                        ? () => selectPath({ l1: path.l1!, l2: row.idx })
                        : panelKind === 'l3' && path.l1 !== undefined && path.l2 !== undefined
                          ? () => selectPath({ l1: path.l1!, l2: path.l2!, l3: row.idx })
                          : panelKind === 'site' && 'url' in row && row.url
                            ? () => window.open(row.url, '_blank', 'noopener,noreferrer')
                            : undefined
                    }
                    onEdit={() => {
                      if (panelKind === 'site') openSiteEditor(row.idx, sites[row.idx])
                      else if (panelKind === 'l3') openCatEditor('l3', row.idx, { title: l2!.nav[row.idx].title, icon: l2!.nav[row.idx].icon, ownVisible: l2!.nav[row.idx].ownVisible })
                      else openCatEditor('l2', row.idx, { title: l1!.nav[row.idx].title, icon: l1!.nav[row.idx].icon, ownVisible: l1!.nav[row.idx].ownVisible })
                    }}
                    onDelete={() => {
                      deleteItem(panelKind === 'site' ? 'site' : panelKind, row.idx)
                    }}
                  />
                ))}
                {panelRows.length === 0 ? (
                  <div className={styles.empty}>
                    <strong>当前层级暂无数据</strong>
                    {canEdit ? '可在上方按钮新增分类或网站' : '登录后可新增分类或网站'}
                  </div>
                ) : null}
              </div>
            </SortableContext>
          </DndContext>
        </main>
      </div>

      {treeOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className={styles.treeOverlay} role="presentation">
              <button
                type="button"
                className={styles.treeBackdrop}
                aria-label="关闭分类树"
                onClick={closeTreePanel}
              />
              <aside className={styles.treeDrawer} aria-label="分类树">
                {categoryTree}
              </aside>
            </div>,
            document.body,
          )
        : null}

      {editKind && editKind !== 'site' ? (
        <div className={styles.modal} onClick={closeEditor}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{editIdx === null ? '新增分类' : '编辑分类'}</h3>
            <label>
              标题
              <input
                className={formInvalid.title ? styles.fieldInvalid : undefined}
                value={catForm.title}
                onChange={(e) => {
                  setCatForm({ ...catForm, title: e.target.value })
                  if (formError) clearFormFeedback()
                }}
                autoFocus
              />
            </label>
            <label>图标 URL<input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="可选" /></label>
            <label className={styles.check}>
              <input type="checkbox" checked={catForm.ownVisible} onChange={(e) => setCatForm({ ...catForm, ownVisible: e.target.checked })} />
              仅登录后在前台可见
            </label>
            {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
            <div className={styles.modalActions}>
              <button type="button" onClick={closeEditor}>取消</button>
              <button type="button" className={styles.primary} onClick={saveCategory}>保存</button>
            </div>
          </div>
        </div>
      ) : null}

      {editKind === 'site' ? (
        <div className={styles.modal} onClick={closeEditor}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{editIdx === null ? '新增网站' : '编辑网站'}</h3>
            <label>
              名称
              <input
                className={formInvalid.name ? styles.fieldInvalid : undefined}
                value={webForm.name}
                onChange={(e) => {
                  setWebForm({ ...webForm, name: e.target.value })
                  if (formError) clearFormFeedback()
                }}
                autoFocus
              />
            </label>
            <label>
              URL
              <input
                className={formInvalid.url ? styles.fieldInvalid : undefined}
                value={webForm.url}
                onChange={(e) => {
                  setWebForm({ ...webForm, url: e.target.value })
                  if (formError) clearFormFeedback()
                }}
              />
            </label>
            <label>描述<textarea rows={3} value={webForm.desc} onChange={(e) => setWebForm({ ...webForm, desc: e.target.value })} /></label>
            <label>图标 URL<input value={webForm.icon || ''} onChange={(e) => setWebForm({ ...webForm, icon: e.target.value })} placeholder="留空将自动使用站点 favicon" /></label>
            {webForm.url ? <SiteIcon name={webForm.name || '?'} icon={webForm.icon} url={webForm.url} size="lg" /> : null}
            <label>评分<input type="number" min={0} max={5} step={0.5} value={webForm.rate ?? 5} onChange={(e) => setWebForm({ ...webForm, rate: Number(e.target.value) })} /></label>
            {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
            <div className={styles.modalActions}>
              <button type="button" onClick={closeEditor}>取消</button>
              <button type="button" className={styles.primary} onClick={saveSite}>保存</button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDialog
        ? createPortal(
            <div
              className={`${styles.modal} ${styles.confirmModal}`}
              role="presentation"
              onClick={() => closeConfirm(false)}
            >
              <div
                className={`${styles.dialog} ${styles.confirmDialog}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="admin-confirm-title"
                aria-describedby="admin-confirm-desc"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 id="admin-confirm-title">{confirmDialog.title}</h3>
                <p id="admin-confirm-desc" className={styles.confirmMessage}>{confirmDialog.message}</p>
                <div className={styles.modalActions}>
                  <button type="button" onClick={() => closeConfirm(false)}>取消</button>
                  <button
                    type="button"
                    className={confirmDialog.danger ? styles.dangerSolid : styles.primary}
                    autoFocus
                    onClick={() => closeConfirm(true)}
                  >
                    {confirmDialog.confirmLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
