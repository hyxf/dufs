import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, ArrowDownToLine, ArrowLeftRight, Check, ChevronRight, CircleAlert, File, FilePlus2, Folder, FolderPlus, LoaderCircle, LogIn, LogOut, Pencil, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react'
import { assertOk, baseUrl, dufsAbsoluteUrl, dufsUrl, errorMessage, fileUrl, formatBytes, formatDate, formatDuration, getPageData, pageFileUrl, readResponseText } from './lib/dufs'
import { getDirectoryData } from './api/client'
import { useAppStore } from './stores/app'
import type { PathItem, UploadItem } from './types'

type DialogState = { title: string; message?: string; value?: string; label?: string; confirm?: string; danger?: boolean; action?: () => void } | null

function App() {
  const { page, setPage, query, setQuery, uploads, addUpload, updateUpload, addToast, toasts } = useAppStore()
  const [sort, setSort] = useState(new URLSearchParams(location.search).get('sort') ?? 'name')
  const [order, setOrder] = useState(new URLSearchParams(location.search).get('order') ?? 'asc')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [dragging, setDragging] = useState(false)
  const [editorText, setEditorText] = useState('')
  const [editorSaved, setEditorSaved] = useState('')
  const [editorStatus, setEditorStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const uploadQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    void getPageData().then((initial) => {
      setPage(initial)
      if (initial.kind === 'Index') void getDirectoryData().then(setPage).catch((error: unknown) => addToast(`Could not refresh directory: ${errorMessage(error)}`, 'error'))
    }).catch((error: unknown) => addToast(errorMessage(error), 'error'))
  }, [setPage, addToast])

  useEffect(() => {
    if (!page || page.kind === 'Index' || !page.editable) return
    fetch(baseUrl()).then(assertOk).then(async (response) => {
      const text = await readResponseText(response)
      setEditorText(text)
      setEditorSaved(text)
    }).catch((error: unknown) => addToast(`Could not load file: ${errorMessage(error)}`, 'error'))
  }, [page, addToast])

  useEffect(() => {
    const hasPending = uploads.some((item) => item.status === 'queued' || item.status === 'uploading')
    const dirty = page?.kind === 'Edit' && editorText !== editorSaved
    if (!hasPending && !dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [uploads, page, editorText, editorSaved])

  const items = useMemo(() => {
    const list = [...(page?.paths ?? [])]
    const direction = order === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      const ad = a.path_type.endsWith('Dir') ? 0 : 1
      const bd = b.path_type.endsWith('Dir') ? 0 : 1
      if (ad !== bd) return ad - bd
      const av = sort === 'size' ? a.size : sort === 'mtime' ? a.mtime : a.name.toLocaleLowerCase()
      const bv = sort === 'size' ? b.size : sort === 'mtime' ? b.mtime : b.name.toLocaleLowerCase()
      return (av < bv ? -1 : av > bv ? 1 : 0) * direction
    })
  }, [page, sort, order])

  if (!page) return <main className="grid min-h-screen place-items-center text-sm text-stone-500"><LoaderCircle className="mr-2 inline animate-spin" size={16} />Loading Dufs…</main>

  const isIndex = page.kind === 'Index'
  const currentName = page.href === '/' ? 'Files' : page.href.split('/').filter(Boolean).at(-1) ?? 'Files'
  const parts = page.href.split('/').filter(Boolean)
  const pathForPart = (index: number) => `${page.uri_prefix}${parts.slice(0, index + 1).map(encodeURIComponent).join('/')}${index < parts.length - 1 ? '/' : ''}`
  const uploadCount = uploads.length
  const canEdit = page.kind === 'Edit' && page.allow_upload && page.allow_delete

  function updateQuery(nextSort = sort, nextOrder = order, nextQuery = query) {
    const params = new URLSearchParams()
    if (nextQuery) params.set('q', nextQuery)
    params.set('sort', nextSort)
    params.set('order', nextOrder)
    location.href = `${location.pathname}?${params}`
  }

  function openDialog(state: NonNullable<DialogState>) {
    setDialog(state)
    setDialogValue(state.value ?? '')
  }

  function closeDialog(value?: string) {
    const current = dialog
    setDialog(null)
    if (value === undefined || !current) return
    if (current.action) current.action()
    else if (current.title === 'New folder') void createFolder(value)
    else if (current.title === 'New file') void createFile(value)
    else if (current.title.startsWith('Move')) void moveItem(current.value ?? '', value)
    else if (current.title.startsWith('Delete')) void deleteItem(current.value ?? '')
  }

  async function createFolder(name: string) {
    const url = fileUrl(name)
    try { await ensureAuthenticated(); await assertOk(await fetch(url, { method: 'MKCOL' })); window.location.assign(pageFileUrl(name, true)) }
    catch (error) { addToast(errorMessage(error), 'error') }
  }

  async function createFile(name: string) {
    const url = fileUrl(name)
    try { await ensureAuthenticated(); await assertOk(await fetch(url, { method: 'PUT', body: '' })); window.location.assign(`${pageFileUrl(name)}?edit`) }
    catch (error) { addToast(errorMessage(error), 'error') }
  }

  async function deleteItem(name: string) {
    const url = name.startsWith('/') ? rootFileUrl(name) : fileUrl(name)
    try {
      await ensureAuthenticated()
      await assertOk(await fetch(url, { method: 'DELETE' }))
      addToast(`Deleted ${name}`, 'success')
      if (name.startsWith('/')) {
        const parent = name.split('/').slice(0, -1).join('/')
        window.location.assign(parent ? `${page!.uri_prefix}${parent.split('/').map(encodeURIComponent).join('/')}/` : page!.uri_prefix)
      } else location.reload()
    }
    catch (error) { addToast(`Could not delete ${name}: ${errorMessage(error)}`, 'error') }
  }

  async function moveItem(source: string, destination: string) {
    const target = destination.startsWith('/') ? destination : `/${destination}`
    const sourcePath = source.startsWith('/') ? source : `/${source}`
    if (sourcePath === target) return
    const targetPath = `${page!.uri_prefix.replace(/\/$/, '')}${target.split('/').map(encodeURIComponent).join('/')}`
    const targetUrl = dufsAbsoluteUrl(targetPath)
    const targetPageUrl = `${location.origin}${targetPath}`
    try {
      await ensureAuthenticated()
      const exists = await fetch(dufsUrl(targetPath), { method: 'HEAD' })
      const performMove = async (overwrite: boolean) => {
        try {
          const response = await fetch(source.startsWith('/') ? rootFileUrl(source) : fileUrl(source), {
            method: 'MOVE',
            headers: { Destination: targetUrl, Overwrite: overwrite ? 'T' : 'F' },
          })
          await assertOk(response)
          const nextUrl = page!.kind === 'Edit' || page!.kind === 'View'
            ? `${targetPageUrl}${location.search}`
            : `${targetPageUrl.split('/').slice(0, -1).join('/')}/`
          window.location.assign(nextUrl)
        } catch (error) {
          if (!overwrite && typeof error === 'object' && error !== null && 'code' in error && error.code === 'destination-exists') {
            openDialog({
              title: 'Replace existing item?',
              message: `${target} already exists. Replace it?`,
              confirm: 'Replace',
              danger: true,
              action: () => void performMove(true),
            })
            return
          }
          addToast(`Could not move ${source}: ${errorMessage(error)}`, 'error')
        }
      }
      if (exists.ok) {
        openDialog({ title: 'Replace existing item?', message: `${target} already exists. Replace it?`, confirm: 'Replace', danger: true, action: () => void performMove(true) })
        return
      }
      if (exists.status !== 404) await assertOk(exists)
      await performMove(false)
    } catch (error) { addToast(`Could not move ${source}: ${errorMessage(error)}`, 'error') }
  }

  async function saveFile() {
    setBusy(true); setEditorStatus('Saving…')
    try { await ensureAuthenticated(); await assertOk(await fetch(baseUrl(), { method: 'PUT', body: editorText })); setEditorSaved(editorText); setEditorStatus('Saved'); addToast('File saved', 'success') }
    catch (error) { setEditorStatus('Save failed'); addToast(errorMessage(error), 'error') }
    finally { setBusy(false) }
  }

  function rootFileUrl(path: string) {
    return dufsUrl(`${page!.uri_prefix}${path.replace(/^\//, '').split('/').map(encodeURIComponent).join('/')}`)
  }

  async function startUpload(file: File, relativePath = file.name, offset = 0, retryId?: string) {
    const id = retryId ?? crypto.randomUUID()
    if (retryId) updateUpload(id, { status: 'queued', progress: offset / Math.max(file.size, 1) * 100, uploadedBytes: offset, bytesPerSecond: 0, etaSeconds: null, error: undefined })
    else addUpload({ id, file, path: relativePath, status: 'queued', progress: 0, uploadedBytes: 0, bytesPerSecond: 0, etaSeconds: null })
    const url = fileUrl(relativePath)
    const send = async (resumeOffset: number) => new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const samples: Array<{ time: number; bytes: number }> = []
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const uploadedBytes = Math.min(file.size, event.loaded + resumeOffset)
        const now = Date.now()
        samples.push({ time: now, bytes: uploadedBytes })
        while (samples.length > 1 && now - samples[0].time > 5000) samples.shift()
        const first = samples[0]
        const elapsed = (now - first.time) / 1000
        const bytesPerSecond = elapsed > 0 ? Math.max(0, (uploadedBytes - first.bytes) / elapsed) : 0
        updateUpload(id, {
          status: 'uploading',
          progress: Math.min(100, uploadedBytes / Math.max(file.size, 1) * 100),
          uploadedBytes,
          bytesPerSecond,
          etaSeconds: bytesPerSecond > 0 ? (file.size - uploadedBytes) / bytesPerSecond : null,
        })
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else {
          const error = new Error(xhr.responseText || `${xhr.status} ${xhr.statusText}`) as Error & { code?: string }
          error.code = xhr.getResponseHeader('x-dufs-error-code') ?? undefined
          reject(error)
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      if (resumeOffset > 0) { xhr.open('PATCH', url); xhr.setRequestHeader('X-Update-Range', 'append'); xhr.send(file.slice(resumeOffset)) }
      else { xhr.open('PUT', url); xhr.send(file) }
    })
    const task = uploadQueue.current.then(async () => {
      await ensureAuthenticated()
      updateUpload(id, { status: 'uploading', uploadedBytes: offset })
      await send(offset)
    })
    uploadQueue.current = task.then(() => undefined, () => undefined)
    try { await task; updateUpload(id, { status: 'complete', progress: 100, uploadedBytes: file.size, bytesPerSecond: 0, etaSeconds: 0 }); addToast(`Uploaded ${relativePath}`, 'success') }
    catch (error) { updateUpload(id, { status: 'failed', error: errorMessage(error) }); addToast(`Upload failed: ${relativePath}`, 'error') }
  }

  async function ensureAuthenticated() {
    const current = useAppStore.getState().page
    if (!current?.auth) return
    const response = await assertOk(await fetch(baseUrl(), { method: 'CHECKAUTH' }))
    const user = await response.text()
    if (user) useAppStore.getState().setPage({ ...current, user })
  }

  async function retryUpload(item: UploadItem) {
    try { await ensureAuthenticated(); const response = await fetch(fileUrl(item.path), { method: 'HEAD' }); const offset = response.ok ? Number(response.headers.get('content-length') || 0) : 0; await startUpload(item.file, item.path, offset, item.id) }
    catch (error) { addToast(errorMessage(error), 'error') }
  }

  async function login() {
    try {
      const response = await assertOk(await fetch(`${baseUrl()}?login`, { method: 'CHECKAUTH' }))
      const user = await response.text()
      const current = useAppStore.getState().page
      if (current) useAppStore.getState().setPage({ ...current, user })
      location.reload()
    }
    catch (error) { addToast(errorMessage(error), 'error') }
  }

  function logout() {
    const xhr = new XMLHttpRequest(); xhr.open('LOGOUT', baseUrl(), true, page!.user); xhr.onload = () => { location.href = location.pathname }; xhr.send()
  }

  async function downloadWithToken(href: string) {
    if (!page?.user) {
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = ''
      anchor.click()
      return
    }
    try { const url = new URL(href); url.searchParams.set('tokengen', ''); const response = await assertOk(await fetch(url)); const token = await response.text(); url.searchParams.delete('tokengen'); url.searchParams.set('token', token); const anchor = document.createElement('a'); anchor.href = url.toString(); anchor.download = ''; anchor.click() }
    catch (error) { addToast(`Download failed: ${errorMessage(error)}`, 'error') }
  }

  function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) void startUpload(file, (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name)
  }

  async function handleDrop(dataTransfer: DataTransfer) {
    if (!page || page.kind !== 'Index' || !page.allow_upload) return
    type Entry = { name: string; isFile: boolean; isDirectory: boolean; file?: (success: (file: File) => void, failure?: (error: DOMException) => void) => void; createReader?: () => { readEntries: (success: (entries: Entry[]) => void, failure?: (error: DOMException) => void) => void } }
    const readEntry = async (entry: Entry, parent = ''): Promise<void> => {
      const path = parent ? `${parent}/${entry.name}` : entry.name
      if (entry.isFile && entry.file) {
        const file = await new Promise<File>((resolve, reject) => entry.file?.(resolve, reject))
        await startUpload(file, path)
      } else if (entry.isDirectory && entry.createReader) {
        const reader = entry.createReader()
        const children: Entry[] = []
        while (true) {
          const batch = await new Promise<Entry[]>((resolve, reject) => reader.readEntries(resolve, reject))
          if (!batch.length) break
          children.push(...batch)
        }
        for (const child of children) await readEntry(child, path)
      }
    }
    const entries: Entry[] = Array.from(dataTransfer.items).flatMap((item) => {
      const entry = (item as unknown as { webkitGetAsEntry?: () => Entry | null }).webkitGetAsEntry?.()
      return entry ? [entry] : []
    })
    if (entries.length) {
      for (const entry of entries) await readEntry(entry)
    } else handleFiles(dataTransfer.files)
  }

  return <div className="min-h-screen bg-[#f4f5f3] text-[#20241f]" onDragEnter={(event) => { event.preventDefault(); if (page.kind === 'Index' && page.allow_upload) setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.relatedTarget) setDragging(false) }} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleDrop(event.dataTransfer) }}>
    <header className="sticky top-0 z-20 flex min-h-[68px] flex-wrap items-center gap-4 border-b border-[#e2e6df] bg-white px-4 py-3 md:flex-nowrap md:px-8">
      <a href={page.uri_prefix || '/'} className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-[#28342b] text-white"><Folder size={18}/></span>dufs</a>
      <nav className="flex min-w-0 items-center overflow-hidden text-sm text-stone-500" aria-label="Breadcrumb"><a href={page.uri_prefix || '/'} className="hover:text-blue-700">Root</a>{parts.map((part, index) => <span key={`${part}-${index}`} className="flex min-w-0 items-center"><ChevronRight size={14} className="mx-1 shrink-0 text-stone-300"/><a className={`truncate hover:text-blue-700 ${index === parts.length - 1 ? 'font-medium text-stone-800' : ''}`} href={pathForPart(index)}>{part}</a></span>)}</nav>
      <div className="ml-auto flex items-center gap-1">
        {isIndex && page.allow_upload && <><button className="toolbar-button" title="Upload files" onClick={() => fileInput.current?.click()}><Upload size={17}/><span>Upload</span></button><input ref={fileInput} type="file" multiple className="hidden" onChange={(event) => { if (event.target.files) handleFiles(event.target.files); event.currentTarget.value = '' }}/><button className="toolbar-button" title="Upload folder" onClick={() => folderInput.current?.click()}><Folder size={17}/><span>Folder upload</span></button><input ref={folderInput} type="file" multiple className="hidden" onClick={(event) => event.currentTarget.setAttribute('webkitdirectory', '')} onChange={(event) => { if (event.target.files) handleFiles(event.target.files); event.currentTarget.value = '' }}/><button className="toolbar-button" title="New folder" onClick={() => openDialog({ title: 'New folder', label: 'Folder name', confirm: 'Create' })}><FolderPlus size={17}/><span>Folder</span></button><button className="toolbar-button" title="New file" onClick={() => openDialog({ title: 'New file', label: 'File name', confirm: 'Create' })}><FilePlus2 size={17}/><span>File</span></button></>}
        {!isIndex && <a className="toolbar-button" href={baseUrl()} title="Download"><ArrowDownToLine size={17}/><span>Download</span></a>}
        {!isIndex && canEdit && <button className="toolbar-button" title="Move or rename" onClick={() => openDialog({ title: 'Move file', label: 'New path', value: page.href, confirm: 'Move' })}><ArrowLeftRight size={17}/><span>Move</span></button>}
        {!isIndex && page.allow_delete && <button className="toolbar-button text-red-700" title="Delete" onClick={() => openDialog({ title: 'Delete file?', message: `Delete ${currentName}? This cannot be undone.`, value: page.href, confirm: 'Delete', danger: true })}><Trash2 size={17}/></button>}
        {isIndex && page.allow_search && <form className="ml-1 flex h-9 w-36 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2 sm:w-52" onSubmit={(event) => { event.preventDefault(); updateQuery(sort, order, query) }}><Search size={16} className="shrink-0 text-stone-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><button type="button" onClick={() => { setQuery(''); if (query) updateQuery(sort, order, '') }} aria-label="Clear search"><X size={14}/></button></form>}
        {page.auth && (page.user ? <button onClick={logout} className="toolbar-button"><span className="grid size-6 place-items-center rounded-full bg-blue-50 text-xs text-blue-700">{page.user.slice(0,1).toUpperCase()}</span><span>{page.user}</span><LogOut size={16}/></button> : <button onClick={() => void login()} className="toolbar-button"><LogIn size={17}/><span>Login</span></button>)}
        {!isIndex && page.kind === 'Edit' && page.editable && page.allow_upload && <button disabled={busy || editorText === editorSaved} onClick={() => void saveFile()} className="rounded-lg bg-[#28342b] px-3 py-2 text-sm font-medium text-white hover:bg-[#37463a] disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>}
      </div>
    </header>

    <main className="mx-auto w-full px-4 py-6 md:px-8">
      {isIndex ? <section className="relative min-h-60 overflow-hidden rounded-xl border border-[#e2e6df] bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pb-4 pt-6"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-stone-400">Directory</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{currentName}</h1></div><p className="text-sm text-stone-500">{items.length} {items.length === 1 ? 'item' : 'items'}</p></div>
        {uploadCount > 0 && <section className="mx-5 mb-4 overflow-hidden rounded-lg border border-stone-200"><div className="flex justify-between border-b border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium">Transfers <span className="text-xs font-normal text-stone-500">{uploadCount} {uploadCount === 1 ? 'transfer' : 'transfers'}</span></div>{uploads.map((upload) => <div key={upload.id} className="flex flex-wrap items-center gap-3 border-b border-stone-100 px-4 py-2 last:border-0"><File size={15} className="text-stone-400"/><span className="min-w-0 flex-1 truncate text-sm">{upload.path}</span><span className="w-32 text-right text-xs text-stone-500">{formatBytes(upload.uploadedBytes)} / {formatBytes(upload.file.size)}</span><span className="w-12 text-right text-xs text-stone-500">{upload.status === 'complete' ? 'Done' : upload.status === 'failed' ? 'Failed' : `${Math.round(upload.progress)}%`}</span><div className="h-1 w-20 overflow-hidden rounded bg-stone-100"><div className={`h-full ${upload.status === 'failed' ? 'bg-red-500' : upload.status === 'complete' ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${upload.progress}%` }}/></div><span className="w-24 text-right text-xs text-stone-500">{upload.status === 'uploading' && upload.bytesPerSecond > 0 ? `${formatBytes(upload.bytesPerSecond)}/s` : ''}</span><span className="w-14 text-right text-xs text-stone-500">{upload.status === 'uploading' ? formatDuration(upload.etaSeconds) : ''}</span>{upload.status === 'failed' && <button onClick={() => void retryUpload(upload)} title={upload.error ? `Retry: ${upload.error}` : 'Retry'}><RefreshCw size={14}/></button>}</div>)}</section>}
        {items.length ? <div className="overflow-x-auto"><table className="w-full border-collapse text-left"><thead><tr className="h-11 border-y border-stone-100 text-xs font-medium text-stone-500"><th className="w-12 pl-6"> </th>{(['name','mtime','size'] as const).map((key) => <th key={key} className={key === 'size' ? 'pr-4 text-right' : ''}><button className="hover:text-blue-700" onClick={() => { const next = sort === key && order === 'asc' ? 'desc' : 'asc'; setSort(key); setOrder(next); updateQuery(key, next) }}>{key === 'mtime' ? 'Last modified' : key === 'size' ? 'Size' : 'Name'}{sort === key ? (order === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>)}<th className="w-36 pr-6 text-right">Actions</th></tr></thead><tbody>{items.map((item) => <PathRow key={item.name} item={item} archive={page.allow_archive} onDelete={() => openDialog({ title: 'Delete item?', message: `Delete ${item.name}? This cannot be undone.`, value: item.name, confirm: 'Delete', danger: true })} onMove={() => openDialog({ title: 'Move item', label: 'New path', value: item.name, confirm: 'Move' })} onDownload={downloadWithToken}/>)}  </tbody></table></div> : <div className="grid min-h-64 place-content-center justify-items-center gap-2 text-center text-stone-500"><div className="grid size-12 place-items-center rounded-xl border border-stone-200 bg-stone-50"><Archive size={20}/></div><p className="text-sm">{query ? 'No results' : page.dir_exists ? 'This folder is empty' : 'Folder will be created when a file is uploaded'}</p></div>}
        <footer className="border-t border-stone-100 px-6 py-3 text-xs text-stone-400">{items.length} {items.length === 1 ? 'item' : 'items'} · {items.filter((item) => item.path_type.endsWith('Dir')).length} folders · {items.filter((item) => !item.path_type.endsWith('Dir')).length} files</footer>
        {dragging && <div className="absolute inset-2 grid place-content-center justify-items-center gap-2 rounded-xl border-2 border-dashed border-blue-500 bg-white/95 text-center"><Upload size={30} className="text-blue-600"/><strong>Drop files to upload</strong><span className="text-sm text-stone-500">Files will be added to this folder</span></div>}
      </section> : <section className="min-h-[70vh] rounded-xl border border-[#e2e6df] bg-white p-5 shadow-sm md:p-6"><div className="mb-4 flex items-center justify-between"><div><h1 className="font-medium">{currentName}</h1><p className="text-xs text-stone-500">{editorStatus || (page.kind === 'View' ? 'Read-only preview' : 'Text editor')}</p></div></div>{page.editable ? <textarea value={editorText} onChange={(event) => setEditorText(event.target.value)} readOnly={page.kind === 'View' || !page.allow_upload} spellCheck={false} className="min-h-[65vh] w-full resize-y rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-sm leading-6 outline-none focus:border-blue-400"/> : ['.pdf','.jpg','.jpeg','.png','.gif','.bmp','.svg','.mp4','.mov','.avi','.wmv','.flv','.webm','.mp3','.ogg','.wav','.m4a'].includes(currentName.slice(currentName.lastIndexOf('.')).toLowerCase()) ? <iframe title={currentName} src={baseUrl()} sandbox="" className="min-h-[65vh] w-full rounded-lg border border-stone-200"/> : <div className="text-sm text-stone-500">This file is too large or binary to edit.</div>}</section>}
    </main>

    {dialog && <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><form className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl" onSubmit={(event) => { event.preventDefault(); closeDialog(dialogValue) }}><div className={`mb-4 grid size-9 place-items-center rounded-xl ${dialog.danger ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{dialog.danger ? <CircleAlert size={19}/> : <Pencil size={18}/>}</div><h2 className="text-lg font-semibold">{dialog.title}</h2>{dialog.message && <p className="mt-2 text-sm text-stone-500">{dialog.message}</p>}{dialog.label && <label className="mt-5 grid gap-2 text-sm text-stone-600">{dialog.label}<input autoFocus value={dialogValue} onChange={(event) => setDialogValue(event.target.value)} className="h-10 rounded-lg border border-stone-200 px-3 outline-none focus:border-blue-400"/></label>}<div className="mt-6 flex justify-end gap-2"><button type="button" className="rounded-lg border border-stone-200 px-4 py-2 text-sm" onClick={() => closeDialog()}>Cancel</button><button className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${dialog.danger ? 'bg-red-700' : 'bg-[#28342b]'}`}>{dialog.confirm ?? 'Continue'}</button></div></form></div>}
    <div className="fixed bottom-5 right-5 z-50 grid w-[min(360px,calc(100vw-40px))] gap-2" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`flex items-center gap-2 rounded-lg border bg-white p-3 text-sm shadow-lg ${toast.kind === 'error' ? 'border-red-200' : toast.kind === 'success' ? 'border-green-200' : 'border-stone-200'}`}><span className={toast.kind === 'error' ? 'text-red-700' : toast.kind === 'success' ? 'text-green-700' : 'text-blue-700'}>{toast.kind === 'success' ? <Check size={16}/> : toast.kind === 'error' ? <CircleAlert size={16}/> : <LoaderCircle size={16}/>}</span><span className="flex-1">{toast.message}</span><button onClick={() => useAppStore.getState().removeToast(toast.id)} aria-label="Dismiss"><X size={14}/></button></div>)}</div>
  </div>
}

function PathRow({ item, archive, onDelete, onMove, onDownload }: { item: PathItem; archive: boolean; onDelete: () => void; onMove: () => void; onDownload: (href: string) => Promise<void> }) {
  const directory = item.path_type.endsWith('Dir')
  const href = pageFileUrl(item.name, directory)
  const moveAllowed = item.allow_upload && item.allow_delete
  const editable = !directory && moveAllowed
  const download = `${fileUrl(item.name)}${directory ? '/' : ''}${directory ? '?zip' : ''}`
  const [busy, setBusy] = useState(false)
  async function authenticatedDownload() { setBusy(true); await onDownload(download); setBusy(false) }
  return <tr className="h-[52px] border-b border-stone-100 last:border-0 hover:bg-stone-50"><td className="pl-6 text-stone-400">{directory ? <Folder size={17}/> : <File size={16}/>}</td><td className="max-w-[45vw]"><a className="block truncate text-sm text-stone-800 hover:text-blue-700" href={href} target={directory ? undefined : '_blank'}>{item.name}</a></td><td className="whitespace-nowrap text-xs text-stone-500">{formatDate(item.mtime)}</td><td className="whitespace-nowrap pr-4 text-right text-xs tabular-nums text-stone-500">{directory ? `${item.size} items` : formatBytes(item.size)}</td><td className="pr-5"><div className="flex justify-end gap-1">{(!directory || archive) && <button className="row-action" title={directory ? 'Download ZIP' : 'Download'} onClick={() => void authenticatedDownload()} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={15}/> : <ArrowDownToLine size={15}/>}</button>}{!directory && editable && <a className="row-action" title="Edit" href={`${href}?edit`}><Pencil size={15}/></a>}{!directory && !editable && <a className="row-action" title="View" href={`${href}?view`}><File size={15}/></a>}{moveAllowed && <button className="row-action" title="Move or rename" onClick={onMove}><ArrowLeftRight size={15}/></button>}{item.allow_delete && <button className="row-action text-red-700" title="Delete" onClick={onDelete}><Trash2 size={15}/></button>}</div></td></tr>
}

export default App
