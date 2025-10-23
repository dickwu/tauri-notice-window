import { useCallback } from 'react'
import { useMessageQueueStore } from '../stores/messageQueueStore'
import { closeAllNoticeWindows } from '../utils/noticeWindow'

/**
 * Hook to hide all pending and active notices
 * @returns Object with hideAllNotices function
 */
export const useHideAllNotices = () => {
  const clearOnLogout = useMessageQueueStore((state) => state.clearOnLogout)

  const hideAllNotices = useCallback(async () => {
    // Close all active windows
    await closeAllNoticeWindows()

    // Clear queue and database
    await clearOnLogout()
  }, [clearOnLogout])

  return { hideAllNotices }
}

