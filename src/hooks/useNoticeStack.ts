import { useCallback, useEffect, useState } from 'react'
import { getNoticeConfig } from '../config/noticeConfig'
import { clearNoticeStack, removeFromNoticeStack, useNoticeStackStore } from '../stores/noticeStackStore'
import { closeNoticeStackWindow } from '../utils/noticeStackWindow'

const isTauriRuntime = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI__)
}

export const useNoticeStack = () => {
  const items = useNoticeStackStore((state) => state.items)
  const [, setRefreshCount] = useState(0)

  useEffect(() => {
    if (!isTauriRuntime()) return
    let unlisten: (() => void) | undefined

    const config = getNoticeConfig()
    const label = config.stackWindowLabel || 'notice-stack'

    import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen(`${label}-update`, () => {
          setRefreshCount((count) => count + 1)
        }),
      )
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {
        // Ignore event listener setup failures.
      })

    return () => unlisten?.()
  }, [])

  const removeItem = useCallback((id: string) => {
    removeFromNoticeStack(id)
  }, [])

  const clearAll = useCallback(() => {
    clearNoticeStack()
  }, [])

  const closeWindow = useCallback(async () => {
    await closeNoticeStackWindow()
  }, [])

  return {
    items,
    total: items.length,
    removeItem,
    clearAll,
    closeWindow,
  }
}
