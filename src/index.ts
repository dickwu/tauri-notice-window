/**
 * Tauri Notice Window Library
 * A reusable React library for cross-window notification management in Tauri v2+ applications
 */

// Types
export type { MessageType, StoredMessage, NoticeConfig, WindowPosition } from './types/message'

// Store
import { useMessageQueueStore, messageQueueSelectors } from './stores/messageQueueStore'
export { useMessageQueueStore, messageQueueSelectors }

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
import { 
  initializeNoticeWindowSystem,
  createNoticeWindow,
  closeNoticeWindow,
  closeAllNoticeWindows,
} from './utils/noticeWindow'
export { 
  initializeNoticeWindowSystem,
  createNoticeWindow,
  closeNoticeWindow,
  closeAllNoticeWindows,
}

import { 
  initializeDatabase,
  saveMessage,
  hasMessage,
  getPendingMessages,
  getMessage,
  markAsShown,
  markAsHidden,
  clearPendingMessages,
} from './utils/db'
export { 
  initializeDatabase,
  saveMessage,
  hasMessage,
  getPendingMessages,
  getMessage,
  markAsShown,
  markAsHidden,
  clearPendingMessages,
}

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
  // Initialize database
  initializeDatabase()

  // Set up window system (store subscription)
  initializeNoticeWindowSystem()

  // Load pending messages from database
  const { initializeFromDatabase } = useMessageQueueStore.getState()
  await initializeFromDatabase()

  console.log('Tauri Notice System initialized')
}

