import type { PageData } from '../types'

export function readPageData(): PageData {
  const node = document.getElementById('index-data')
  if (!node) throw new Error('Missing server page data')
  const encoded = node instanceof HTMLTemplateElement ? node.innerHTML.trim() : node.textContent?.trim() ?? ''
  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as PageData
}

export function dufsUrl(path: string) {
  if (import.meta.env.DEV) return `${location.origin}/__dufs_dev${path}`
  return `${location.origin}${path}`
}

export function dufsAbsoluteUrl(path: string) {
  const origin = import.meta.env.DEV ? (import.meta.env.VITE_DUFS_BACKEND || 'http://127.0.0.1:5001') : location.origin
  return new URL(path, origin).toString()
}

export function baseUrl() {
  return dufsUrl(location.pathname)
}

export function fileUrl(name: string) {
  const base = location.pathname.replace(/\/$/, '')
  return dufsUrl(`${base}/${name.split('/').map(encodeURIComponent).join('/')}`)
}

export function pageFileUrl(name: string, directory = false) {
  const base = location.pathname.replace(/\/$/, '')
  return `${base}/${name.split('/').map(encodeURIComponent).join('/')}${directory ? '/' : ''}`
}

export async function getPageData(): Promise<PageData> {
  if (!import.meta.env.DEV) return readPageData()
  const url = `${dufsUrl(location.pathname)}${location.search}`
  const response = await fetch(url, { headers: { Accept: 'text/html' } })
  if (!response.ok) throw new Error((await response.text()) || `${response.status} ${response.statusText}`)
  const html = await response.text()
  const node = new DOMParser().parseFromString(html, 'text/html').getElementById('index-data')
  if (!node) throw new Error('Dufs did not return page data')
  const encoded = node instanceof HTMLTemplateElement ? node.innerHTML.trim() : node.textContent?.trim() ?? ''
  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as PageData
}

export function formatBytes(size: number) {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / 1024 ** index
  return `${index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

export function formatDate(timestamp: number) {
  if (!timestamp) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
}

export function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const messages: Record<string, string> = {
      'upload-disabled': 'Uploading is disabled for this path.',
      'delete-disabled': 'Replacing or deleting files is disabled for this path.',
      'readonly-descendant': 'This directory contains read-only entries.',
      'already-exists': 'An item with this name already exists.',
      'destination-exists': 'The destination already exists.',
      'invalid-upload-offset': 'The upload offset is invalid. Retry the upload.',
      forbidden: 'You do not have permission to perform this action.',
      'invalid-path': 'The path is invalid.',
    }
    const code = (error as { code?: string }).code
    if (code && messages[code]) return messages[code]
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

export async function readResponseText(response: Response) {
  const charset = response.headers.get('content-type')?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]
  const bytes = await response.arrayBuffer()
  try { return new TextDecoder(charset || 'utf-8').decode(bytes) }
  catch { return new TextDecoder('utf-8').decode(bytes) }
}

export function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return '--:--'
  const total = Math.ceil(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remaining = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours ? `${pad(hours)}:${pad(minutes)}:${pad(remaining)}` : `${pad(minutes)}:${pad(remaining)}`
}

export async function assertOk(response: Response) {
  if (response.ok) return response
  const message = (await response.text()) || `${response.status} ${response.statusText}`
  const error = new Error(message) as Error & { code?: string }
  error.code = response.headers.get('x-dufs-error-code') ?? undefined
  throw error
}
