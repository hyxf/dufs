export type PathType = 'Dir' | 'SymlinkDir' | 'File' | 'SymlinkFile'
export type PageKind = 'Index' | 'Edit' | 'View'

export interface PathItem {
  path_type: PathType
  name: string
  mtime: number
  size: number
  allow_upload: boolean
  allow_delete: boolean
  readonly_descendant: boolean
}

export interface PageData {
  href: string
  uri_prefix: string
  kind: PageKind
  paths: PathItem[]
  allow_upload: boolean
  allow_delete: boolean
  allow_search: boolean
  allow_archive: boolean
  auth: boolean
  user: string | null
  dir_exists: boolean
  editable: boolean
}

export interface UploadItem {
  id: string
  file: File
  path: string
  status: 'queued' | 'uploading' | 'complete' | 'failed'
  progress: number
  uploadedBytes: number
  bytesPerSecond: number
  etaSeconds: number | null
  error?: string
}

export interface ToastItem {
  id: string
  message: string
  kind: 'info' | 'success' | 'error'
}
