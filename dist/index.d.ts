/**
 * Tauri Notice Window Library
 * A reusable React library for cross-window notification management in Tauri v2+ applications
 */
export type { MessageType, StoredMessage, NoticeConfig, WindowPosition } from './types/message';
import { useMessageQueueStore, messageQueueSelectors } from './stores/messageQueueStore';
export { useMessageQueueStore, messageQueueSelectors };
export { useNoticeWindow } from './hooks/useNoticeWindow';
export { useCloseNotice } from './hooks/useCloseNotice';
export { useHideNotice } from './hooks/useHideNotice';
export { useHideAllNotices } from './hooks/useHideAllNotices';
export { useMessageQueue } from './hooks/useMessageQueue';
export { NoticeLayout, useNoticeWindowContext } from './components/NoticeLayout';
export { setNoticeConfig, getNoticeConfig } from './config/noticeConfig';
import { initializeNoticeWindowSystem, createNoticeWindow, closeNoticeWindow, closeAllNoticeWindows, calculateWindowPosition, getLogicalScreenSize } from './utils/noticeWindow';
export { initializeNoticeWindowSystem, createNoticeWindow, closeNoticeWindow, closeAllNoticeWindows, calculateWindowPosition, getLogicalScreenSize, };
import { initializeDatabase, getPendingMessages, getMessage } from './utils/db';
export { initializeDatabase, getPendingMessages, getMessage, };
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
export declare const initializeNoticeSystem: () => Promise<void>;
/**
 * Delete a message by ID
 * Removes the message from both the runtime queue (Zustand) and persistent storage (IndexedDB)
 * If the message is currently being displayed, its window will be closed automatically
 *
 * @param messageId - The ID of the message to delete
 *
 * @example
 * ```typescript
 * import { deleteMessageById } from 'tauri-notice-window'
 *
 * // Delete a specific message
 * await deleteMessageById('message-123')
 *
 * // If message is currently shown, window closes and next message displays
 * ```
 */
export declare const deleteMessageById: (messageId: string) => Promise<void>;
/**
 * Hide a message by ID
 * Marks the message as hidden in the database and removes it from the queue
 * Typically used for server-triggered hide events
 *
 * @param messageId - The ID of the message to hide
 *
 * @example
 * ```typescript
 * import { hideMessageById } from 'tauri-notice-window'
 *
 * // Server triggers hide via websocket
 * socket.on('hide_message', async (data) => {
 *   await hideMessageById(data.message_id)
 * })
 * ```
 */
export declare const hideMessageById: (messageId: string) => Promise<void>;
/**
 * Mark a message as shown
 * Updates the database to prevent the message from being shown again
 *
 * @param messageId - The ID of the message to mark as shown
 *
 * @example
 * ```typescript
 * import { markMessageAsShown } from 'tauri-notice-window'
 *
 * // Manually mark a message as shown without displaying it
 * await markMessageAsShown('message-123')
 * ```
 */
export declare const markMessageAsShown: (messageId: string) => Promise<void>;
//# sourceMappingURL=index.d.ts.map