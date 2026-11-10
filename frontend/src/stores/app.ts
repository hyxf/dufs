import { create } from 'zustand'
import type { PageData, ToastItem, UploadItem } from '../types'

interface AppState {
  page: PageData | null
  uploads: UploadItem[]
  toasts: ToastItem[]
  query: string
  setPage: (page: PageData) => void
  setQuery: (query: string) => void
  addUpload: (upload: UploadItem) => void
  updateUpload: (id: string, update: Partial<UploadItem>) => void
  addToast: (message: string, kind?: ToastItem['kind']) => void
  removeToast: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  page: null,
  uploads: [],
  toasts: [],
  query: new URLSearchParams(location.search).get('q') ?? '',
  setPage: (page) => set({ page }),
  setQuery: (query) => set({ query }),
  addUpload: (upload) => set((state) => ({ uploads: [upload, ...state.uploads] })),
  updateUpload: (id, update) => set((state) => ({ uploads: state.uploads.map((item) => item.id === id ? { ...item, ...update } : item) })),
  addToast: (message, kind = 'info') => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, kind }] }))
    window.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })), 3600)
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))
