import { useCallback } from 'react'
import { useMessageQueueStore } from '../stores/messageQueueStore'
import { closeNoticeWindow } from '../utils/noticeWindow'

/**
 * Hook to hide a specific notice by ID
 * Typically used for server-triggered hide events
 * @returns Object with hideNotice function
 */
export const useHideNotice = () => {
  const hideMessage = useMessageQueueStore((state) => state.hideMessage)

  const hideNotice = useCallback(
    async (messageId: string) => {
      // Hide message (updates DB and removes from queue)
      await hideMessage(messageId)

      // Close the window
      await closeNoticeWindow(messageId)
    },
    [hideMessage]
  )

  return { hideNotice }
}

