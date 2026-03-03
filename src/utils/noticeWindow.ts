import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { primaryMonitor } from '@tauri-apps/api/window'
import type { MessageType, WindowPosition } from '../types/message'
import { useMessageQueueStore } from '../stores/messageQueueStore'
import { getNoticeConfig } from '../config/noticeConfig'

/**
 * Map of active notice windows
 */
const activeWindows = new Map<string, WebviewWindow>()

/**
 * Detect if running on macOS
 */
const isMacOS = (): boolean => {
  return navigator.platform.toLowerCase().includes('mac') ||
    navigator.userAgent.toLowerCase().includes('mac')
}

/**
 * Validate if a URL is usable for WebviewWindow
 * @param url - URL to validate
 * @returns true if URL appears valid
 */
const isValidWindowUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return false

  try {
    if (url.startsWith('/')) return true
    if (url.startsWith('http://') || url.startsWith('https://')) return true
    if (url.startsWith('tauri://')) return true
    return false
  } catch {
    return false
  }
}

/**
 * Get logical screen dimensions (accounts for DPI scaling)
 * primaryMonitor().size returns physical pixels; Tauri window APIs expect logical pixels.
 * @returns Object with logical screenWidth and screenHeight
 */
export const getLogicalScreenSize = async (): Promise<{ screenWidth: number; screenHeight: number }> => {
  let screenWidth = 1920
  let screenHeight = 1080

  try {
    const monitor = await primaryMonitor()
    if (monitor?.size) {
      const scaleFactor = monitor.scaleFactor || 1
      screenWidth = monitor.size.width / scaleFactor
      screenHeight = monitor.size.height / scaleFactor
    }
  } catch (error) {
    console.warn('Failed to get monitor info, using defaults:', error)
  }

  return { screenWidth, screenHeight }
}

/**
 * Calculate window position based on position preset or custom coordinates
 * Uses logical pixels (DPI-aware) for correct placement on HiDPI displays.
 * @param width - Window width in logical pixels
 * @param height - Window height in logical pixels
 * @param positionConfig - Position configuration
 * @returns Object with x and y coordinates in logical pixels
 */
export const calculateWindowPosition = async (
  width: number,
  height: number,
  positionConfig?: WindowPosition
): Promise<{ x: number; y: number }> => {
  const padding = positionConfig?.padding ?? 20

  // If custom coordinates provided, use them directly
  if (positionConfig?.x !== undefined && positionConfig?.y !== undefined) {
    return { x: positionConfig.x, y: positionConfig.y }
  }

  const { screenWidth, screenHeight } = await getLogicalScreenSize()

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
      return {
        x: screenWidth - width - padding,
        y: screenHeight - height - padding,
      }
  }
}

/**
 * Create a new notice window for the given message
 * When autoSize is enabled, the window is created hidden and will be shown
 * by NoticeLayout after content measurement and resize.
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
  let windowUrl = `${config.routePrefix}/${message.type}?id=${message.id}`

  // Validate URL and fallback to 404 if invalid
  if (!isValidWindowUrl(windowUrl)) {
    console.warn(`Invalid window URL: ${windowUrl}. Using fallback 404 page.`)
    windowUrl = config.notFoundUrl || '/404'
  }

  // Determine if auto-sizing is enabled
  const autoSize = config.autoSize ?? true

  // Determine window dimensions
  const width = message.min_width || config.defaultWidth
  // When autoSize is enabled, start the hidden window at maxHeight so that
  // 100vh in the webview is large enough for content to render at natural height.
  // NoticeLayout will then measure the content and shrink the window to fit.
  const height = autoSize
    ? (config.maxHeight ?? 800)
    : (message.min_height || config.defaultHeight)

  // Determine decorations (title bar) setting
  const decorations = message.decorations ?? config.defaultDecorations ?? true

  // Calculate window position (use defaultHeight for initial position so it doesn't jump)
  const initialPositionHeight = message.min_height || config.defaultHeight
  const { x, y } = await calculateWindowPosition(width, initialPositionHeight, message.windowPosition)

  try {
    // Build window options based on platform and decorations setting
    const windowOptions: ConstructorParameters<typeof WebviewWindow>[1] = {
      url: windowUrl,
      title: message.title,
      width,
      height,
      x,
      y,
      resizable: true,
      skipTaskbar: false,
      alwaysOnTop: true,
    }

    // When autoSize is enabled, create the window hidden.
    // NoticeLayout will measure content, resize, reposition, then show.
    if (autoSize) {
      windowOptions.visible = false
    }

    if (decorations) {
      windowOptions.decorations = true
    } else if (isMacOS()) {
      windowOptions.decorations = true
      windowOptions.titleBarStyle = 'overlay'
      windowOptions.hiddenTitle = true
    } else {
      windowOptions.decorations = false
      windowOptions.transparent = true
    }

    // Create new webview window
    const noticeWindow = new WebviewWindow(windowLabel, windowOptions)

    // Track active window
    activeWindows.set(normalizedId, noticeWindow)
    store.addActiveWindow(normalizedId)

    // Auto-close timeout for borderless windows (decorations=false)
    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null
    const loadTimeout = config.loadTimeout ?? 10000

    if (!decorations && loadTimeout > 0) {
      loadTimeoutId = setTimeout(async () => {
        console.warn(`Notice window ${windowLabel} load timeout - auto closing`)
        try {
          await noticeWindow.close()
        } catch (e) {
          // Window may already be closed
        }
      }, loadTimeout)
    }

    // Clear timeout when window is created successfully
    noticeWindow.once('tauri://created', () => {
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }
      console.log(`Notice window created successfully: ${windowLabel}`)
    })

    // Handle webview errors - auto close on error when borderless
    noticeWindow.once('tauri://error', async (event) => {
      console.error(`Notice window error: ${windowLabel}`, event)
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }
      if (!decorations) {
        try {
          await noticeWindow.close()
        } catch (e) {
          // Window may already be closed
        }
      }
    })

    // Register destroy event listener
    noticeWindow.once('tauri://destroyed', async () => {
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }

      activeWindows.delete(normalizedId)
      store.removeActiveWindow(normalizedId)

      await store.markMessageAsShown(normalizedId)

      store.clearCurrent()
    })

    console.log(`Created notice window: ${windowLabel} (autoSize: ${autoSize}, visible: ${!autoSize})`)
  } catch (error) {
    console.error('Failed to create notice window:', error)
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
  const store = useMessageQueueStore.getState()

  if (window) {
    try {
      await window.close()
      activeWindows.delete(normalizedId)
      store.removeActiveWindow(normalizedId)

      await store.markMessageAsShown(normalizedId)

      store.clearCurrent()

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

  useMessageQueueStore.subscribe((state) => {
    const currentMessage = state.currentMessage

    if (currentMessage && currentMessage !== previousMessage) {
      previousMessage = currentMessage
      createNoticeWindow(currentMessage)
    } else if (!currentMessage) {
      previousMessage = null
    }
  })

  console.log('Notice window system initialized')
}
