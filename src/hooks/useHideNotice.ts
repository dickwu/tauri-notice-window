import { useCallback } from 'react'
import { useMessageQueueStore } from '../stores/messageQueueStore'
import { closeNoticeWindow } from '../utils/noticeWindow'
import { markAsHidden } from '../utils/db'

/**
 * Hook to hide a specific notice by ID
 * Typically used for server-triggered hide events
 * @returns Object with hideNotice function
 */
export const useHideNotice = () => {
  const store = useMessageQueueStore()

  const hideNotice = useCallback(
    async (messageId: string) => {
      // Mark as hidden in database
      await markAsHidden(messageId)

      // Close the window
      await closeNoticeWindow(messageId)

      // Clear current if it matches
      if (store.currentMessage?.id === messageId) {
        store.clearCurrent()
      }
    },
    [store]
  )

  return { hideNotice }
}

