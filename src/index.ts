/**
 * Tauri Notice Window Library
 * A reusable React library for cross-window notification management in Tauri v2+ applications
 */

// Types
export type { MessageType, StoredMessage, NoticeConfig, WindowPosition } from './types/message'

// Store
export { useMessageQueueStore, messageQueueSelectors } from './stores/messageQueueStore'

// Hooks
export { useNoticeWindow } from './hooks/useNoticeWindow'
export { useCloseNotice } from './hooks/useCloseNotice'
export { useHideNotice } from './hooks/useHideNotice'
export { useHideAllNotices } from './hooks/useHideAllNotices'
export { useMessageQueue } from './hooks/useMessageQueue'

// Components
export { NoticeLayout } from './components/NoticeLayout'

// Configuration
export { setNoticeConfig, getNoticeConfig } from './config/noticeConfig'

// Utils
export { 
  initializeNoticeWindowSystem,
  createNoticeWindow,
  closeNoticeWindow,
  closeAllNoticeWindows,
} from './utils/noticeWindow'

export { 
  initializeDatabase,
  saveMessage,
  hasMessage,
  getPendingMessages,
  getMessage,
  markAsShown,
  markAsHidden,
  clearPendingMessages,
} from './utils/db'

/**
 * Initialize the complete notice window system
 * Call this once during app startup (e.g., in App.tsx or main layout)
 * 
 * @example
 * ```typescript
 * import { initializeNoticeSystem } from 'tauri-notice-window'
 * 
 * useEffect(() => {
 *   initializeNoticeSystem()
 * }, [])
 * ```
 */
export const initializeNoticeSystem = async (): Promise<void> => {
  const { initializeDatabase } = await import('./utils/db')
  const { initializeNoticeWindowSystem } = await import('./utils/noticeWindow')
  const { useMessageQueueStore } = await import('./stores/messageQueueStore')

  // Initialize database
  initializeDatabase()

  // Set up window system (store subscription)
  initializeNoticeWindowSystem()

  // Load pending messages from database
  const { initializeFromDatabase } = useMessageQueueStore.getState()
  await initializeFromDatabase()

  console.log('Tauri Notice System initialized')
}

