import { create, StateCreator } from 'zustand'
import { syncTabs } from 'zustand-sync'
import type { StackedNotification } from '../types/stack'

interface NoticeStackState {
  items: StackedNotification[]
  addItem: (item: StackedNotification) => void
  removeItem: (id: string) => void
  clearAll: () => void
}

const storeCreator: StateCreator<NoticeStackState> = (set) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      const normalizedId = String(item.id)
      const next = state.items.filter((n) => n.id !== normalizedId)
      next.push({ ...item, id: normalizedId })
      return { items: next }
    })
  },

  removeItem: (id) => {
    const normalizedId = String(id)
    set((state) => ({
      items: state.items.filter((n) => n.id !== normalizedId),
    }))
  },

  clearAll: () => {
    set({ items: [] })
  },
})

export const useNoticeStackStore = create<NoticeStackState>()(
  syncTabs(storeCreator, {
    name: 'tauri-notice-stack',
  }),
)

export const clearNoticeStack = (): void => {
  useNoticeStackStore.getState().clearAll()
}

export const removeFromNoticeStack = (id: string): void => {
  useNoticeStackStore.getState().removeItem(id)
}
