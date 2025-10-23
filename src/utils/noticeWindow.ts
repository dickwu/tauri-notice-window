import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { primaryMonitor } from '@tauri-apps/api/window'
import type { MessageType, WindowPosition } from '../types/message'
import { useMessageQueueStore } from '../stores/messageQueueStore'
import { markAsShown } from './db'
import { getNoticeConfig } from '../config/noticeConfig'

/**
 * Map of active notice windows
 */
const activeWindows = new Map<string, WebviewWindow>()

/**
 * Calculate window position based on position preset or custom coordinates
 * @param width - Window width
 * @param height - Window height
 * @param positionConfig - Position configuration
 * @returns Object with x and y coordinates
 */
const calculateWindowPosition = async (
  width: number,
  height: number,
  positionConfig?: WindowPosition
): Promise<{ x: number; y: number }> => {
  const padding = positionConfig?.padding ?? 20

  // If custom coordinates provided, use them directly
  if (positionConfig?.x !== undefined && positionConfig?.y !== undefined) {
    return { x: positionConfig.x, y: positionConfig.y }
  }

  // Get screen dimensions
  let screenWidth = 1920
  let screenHeight = 1080

  try {
    const monitor = await primaryMonitor()
    if (monitor?.size) {
      screenWidth = monitor.size.width
      screenHeight = monitor.size.height
    }
  } catch (error) {
    console.warn('Failed to get monitor info, using defaults:', error)
  }

  // Calculate position based on preset
  const position = positionConfig?.position ?? 'right-bottom'

  switch (position) {
    case 'right-bottom':
      return {
        x: screenWidth - width - padding,
        y: screenHeight - height - padding,
      }

    case 'right-top':
      return {
        x: screenWidth - width - padding,
        y: padding,
      }

    case 'left-bottom':
      return {
        x: padding,
        y: screenHeight - height - padding,
      }

    case 'left-top':
      return {
        x: padding,
        y: padding,
      }

    case 'center':
      return {
        x: (screenWidth - width) / 2,
        y: (screenHeight - height) / 2,
      }

    default:
      // Default to right-bottom
      return {
        x: screenWidth - width - padding,
        y: screenHeight - height - padding,
      }
  }
}

/**
 * Create a new notice window for the given message
 * @param message - Message to display in the window
 */
export const createNoticeWindow = async (message: MessageType): Promise<void> => {
  const normalizedId = String(message.id)
  const store = useMessageQueueStore.getState()

  // Check if window already exists
  if (store.isWindowActive(normalizedId)) {
    console.log(`Notice window already open for message: ${normalizedId}`)
    return
  }

  const config = getNoticeConfig()
  const windowLabel = `notice-${normalizedId}`
  const windowUrl = `${config.routePrefix}/${message.type}?id=${message.id}`

  // Determine window dimensions
  const width = message.min_width || config.defaultWidth
  const height = message.min_height || config.defaultHeight

  // Calculate window position
  const { x, y } = await calculateWindowPosition(width, height, message.windowPosition)

  try {
    // Create new webview window
    const noticeWindow = new WebviewWindow(windowLabel, {
      url: windowUrl,
      title: message.title,
      width,
      height,
      x,
      y,
      resizable: true,
      decorations: true,
      skipTaskbar: false,
      alwaysOnTop: true,
    })

    // Track active window
    activeWindows.set(normalizedId, noticeWindow)
    store.addActiveWindow(normalizedId)

    // Register destroy event listener
    noticeWindow.once('tauri://destroyed', async () => {
      // Clean up tracking
      activeWindows.delete(normalizedId)
      store.removeActiveWindow(normalizedId)

      // Mark as shown in database
      await markAsShown(normalizedId)

      // Show next message
      store.clearCurrent()
    })

    console.log(`Created notice window: ${windowLabel}`)
  } catch (error) {
    console.error('Failed to create notice window:', error)
    // Clean up on error
    store.removeActiveWindow(normalizedId)
    store.clearCurrent()
  }
}

/**
 * Close a specific notice window by message ID
 * @param messageId - ID of the message whose window should be closed
 */
export const closeNoticeWindow = async (messageId: string): Promise<void> => {
  const normalizedId = String(messageId)
  const window = activeWindows.get(normalizedId)

  if (window) {
    try {
      await window.close()
      activeWindows.delete(normalizedId)
      console.log(`Closed notice window: ${normalizedId}`)
    } catch (error) {
      console.error('Failed to close notice window:', error)
    }
  }
}

/**
 * Close all active notice windows
 */
export const closeAllNoticeWindows = async (): Promise<void> => {
  const closePromises = Array.from(activeWindows.keys()).map((id) =>
    closeNoticeWindow(id)
  )
  await Promise.all(closePromises)
}

/**
 * Initialize the notice window system
 * Sets up store subscription to auto-create windows when currentMessage changes
 */
export const initializeNoticeWindowSystem = (): void => {
  let previousMessage: MessageType | null = null

  // Subscribe to store changes and watch for currentMessage updates
  useMessageQueueStore.subscribe((state) => {
    const currentMessage = state.currentMessage
    
    // Only create window if currentMessage changed and is not null
    if (currentMessage && currentMessage !== previousMessage) {
      previousMessage = currentMessage
      createNoticeWindow(currentMessage)
    } else if (!currentMessage) {
      previousMessage = null
    }
  })

  console.log('Notice window system initialized')
}

