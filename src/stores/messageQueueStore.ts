import { create, StateCreator } from 'zustand'
import { syncTabs } from 'zustand-sync'
import type { MessageType } from '../types/message'
import {
  getPendingMessages,
  saveMessage,
  updateQueueStatus,
  clearPendingMessages,
  updateQueuePositions,
  hasMessage,
} from '../utils/db'

/**
 * Message Queue Store State Interface
 */
interface MessageQueueState {
  // State
  queue: MessageType[]
  currentMessage: MessageType | null
  isProcessing: boolean
  initialized: boolean
  activeWindowIds: string[]

  // Actions
  enqueue: (message: MessageType) => Promise<void>
  dequeue: () => MessageType | null
  showNext: () => Promise<void>
  clearCurrent: () => void
  setCurrentMessage: (message: MessageType | null) => void
  setIsProcessing: (processing: boolean) => void
  setQueue: (queue: MessageType[]) => void
  initializeFromDatabase: () => Promise<void>
  persistQueue: () => Promise<void>
  clearOnLogout: () => Promise<void>
  addActiveWindow: (id: string) => void
  removeActiveWindow: (id: string) => void
  isWindowActive: (id: string) => boolean
}

/**
 * Zustand store with zustand-sync for cross-window state management
 */
const storeCreator: StateCreator<MessageQueueState> = (set, get) => ({
      // Initial state
      queue: [],
      currentMessage: null,
      isProcessing: false,
      initialized: false,
      activeWindowIds: [],

      // Enqueue a new message
      enqueue: async (message: MessageType) => {
        const state = get()
        
        // Check if message already exists in database
        const exists = await hasMessage(message.id)
        if (!exists) {
          await saveMessage(message)
        }

        // Add to queue if not already present
        const alreadyInQueue = state.queue.some((m: MessageType) => m.id === message.id)
        if (!alreadyInQueue) {
          const newQueue = [...state.queue, message]
          set({ queue: newQueue })
          await get().persistQueue()
        }

        // Auto-show if not currently processing
        if (!state.isProcessing && !state.currentMessage) {
          await get().showNext()
        }
      },

      // Dequeue the next message
      dequeue: () => {
        const state = get()
        if (state.queue.length === 0) return null

        const [nextMessage, ...remainingQueue] = state.queue
        set({ queue: remainingQueue })
        return nextMessage
      },

      // Show the next message in queue
      showNext: async () => {
        const state = get()
        
        // Skip if already processing
        if (state.isProcessing) return

        const nextMessage = get().dequeue()
        if (!nextMessage) {
          set({ isProcessing: false, currentMessage: null })
          return
        }

        // Update state
        set({
          currentMessage: nextMessage,
          isProcessing: true,
        })

        // Update database status
        await updateQueueStatus(nextMessage.id, 'showing')
        await get().persistQueue()
      },

      // Clear current message and show next
      clearCurrent: () => {
        set({
          currentMessage: null,
          isProcessing: false,
        })

        // Auto-show next message
        const state = get()
        if (state.queue.length > 0) {
          get().showNext()
        }
      },

      // Set current message directly
      setCurrentMessage: (message: MessageType | null) => {
        set({ currentMessage: message })
      },

      // Set processing flag
      setIsProcessing: (processing: boolean) => {
        set({ isProcessing: processing })
      },

      // Set entire queue
      setQueue: (queue: MessageType[]) => {
        set({ queue })
      },

      // Initialize from database on startup
      initializeFromDatabase: async () => {
        const state = get()
        
        // Prevent duplicate initialization
        if (state.initialized) return

        set({ initialized: true })

        // Load pending messages from database
        const pendingMessages = await getPendingMessages()
        
        if (pendingMessages.length > 0) {
          set({ queue: pendingMessages })
          
          // Auto-show first message
          await get().showNext()
        }
      },

      // Persist queue to database
      persistQueue: async () => {
        const state = get()
        const positions = state.queue.map((msg: MessageType, index: number) => ({
          id: msg.id,
          position: index,
        }))
        await updateQueuePositions(positions)
      },

      // Clear all messages on logout
      clearOnLogout: async () => {
        set({
          queue: [],
          currentMessage: null,
          isProcessing: false,
          activeWindowIds: [],
          initialized: false,
        })
        await clearPendingMessages()
      },

      // Add active window ID
      addActiveWindow: (id: string) => {
        const state = get()
        const normalizedId = String(id)
        if (!state.activeWindowIds.includes(normalizedId)) {
          set({ activeWindowIds: [...state.activeWindowIds, normalizedId] })
        }
      },

      // Remove active window ID
      removeActiveWindow: (id: string) => {
        const state = get()
        const normalizedId = String(id)
        set({
          activeWindowIds: state.activeWindowIds.filter((wid: string) => wid !== normalizedId),
        })
      },

      // Check if window is active
      isWindowActive: (id: string) => {
        const state = get()
        const normalizedId = String(id)
        return state.activeWindowIds.includes(normalizedId)
      },
})

export const useMessageQueueStore = create<MessageQueueState>()(
  syncTabs(storeCreator, {
      name: 'tauri-notice-queue',
  })
)

/**
 * Selectors for optimized subscriptions
 */
export const messageQueueSelectors = {
  queueLength: (state: MessageQueueState) => state.queue.length,
  currentMessage: (state: MessageQueueState) => state.currentMessage,
  isProcessing: (state: MessageQueueState) => state.isProcessing,
  queue: (state: MessageQueueState) => state.queue,
}

