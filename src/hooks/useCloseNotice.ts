import { useCallback } from 'react'
import { useMessageQueueStore } from '../stores/messageQueueStore'
import { closeNoticeWindow } from '../utils/noticeWindow'

/**
 * Hook to close the current notice window
 * Should be called from within a notice window component
 * @returns Object with closeNotice function
 */
export const useCloseNotice = () => {
  const currentMessage = useMessageQueueStore((state) => state.currentMessage)

  const closeNotice = useCallback(async () => {
    if (currentMessage) {
      await closeNoticeWindow(currentMessage.id)
    }
  }, [currentMessage])

  return { closeNotice }
}

