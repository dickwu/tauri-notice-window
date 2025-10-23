import { useCallback } from 'react'
import type { MessageType } from '../types/message'
import { useMessageQueueStore } from '../stores/messageQueueStore'

/**
 * Hook to open notice windows
 * @returns Object with showNotice function
 */
export const useNoticeWindow = () => {
  const enqueue = useMessageQueueStore((state) => state.enqueue)

  const showNotice = useCallback(
    async (message: MessageType) => {
      await enqueue(message)
    },
    [enqueue]
  )

  return { showNotice }
}

