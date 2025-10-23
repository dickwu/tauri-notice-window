import { useMessageQueueStore, messageQueueSelectors } from '../stores/messageQueueStore'

/**
 * Hook to access message queue state
 * @returns Queue state information
 */
export const useMessageQueue = () => {
  const queueLength = useMessageQueueStore(messageQueueSelectors.queueLength)
  const currentMessage = useMessageQueueStore(messageQueueSelectors.currentMessage)
  const isProcessing = useMessageQueueStore(messageQueueSelectors.isProcessing)
  const queue = useMessageQueueStore(messageQueueSelectors.queue)

  return {
    queueLength,
    currentMessage,
    isProcessing,
    queue,
  }
}

