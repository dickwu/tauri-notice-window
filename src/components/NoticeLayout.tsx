import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { MessageType } from '../types/message'
import { getMessage } from '../utils/db'
import { getNoticeConfig } from '../config/noticeConfig'
import { calculateWindowPosition } from '../utils/noticeWindow'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi'

/**
 * Context provided to all children of NoticeLayout.
 * windowReady is false during the measurement phase (before auto-sizing),
 * and true once the window has been sized and is visible.
 *
 * Consumers should remove viewport-filling constraints (e.g. h-screen, flex-1)
 * when windowReady is false so content can render at its natural height for measurement.
 */
interface NoticeWindowContextType {
  windowReady: boolean
}

const NoticeWindowContext = createContext<NoticeWindowContextType>({ windowReady: true })

/**
 * Hook for notice window pages to know whether the window has been sized and is visible.
 * Use this to conditionally apply h-screen / flex-1 only after the window is ready.
 *
 * @example
 * const { windowReady } = useNoticeWindowContext()
 * <div className={`flex flex-col ${windowReady ? 'h-screen' : ''}`}>
 */
export const useNoticeWindowContext = (): NoticeWindowContextType => useContext(NoticeWindowContext)

/**
 * Resize and reposition the current window to fit measured content, then show it.
 *
 * measuredHeight is the webview content height (CSS pixels).
 * setSize() sets the OUTER window size (including title bar/borders).
 * We add a chrome buffer to ensure content isn't clipped by window decorations.
 */
const resizeAndShowWindow = async (measuredHeight: number): Promise<void> => {
  try {
    const config = getNoticeConfig()
    const width = config.defaultWidth || 400
    const maxHeight = config.maxHeight ?? 800
    const minHeight = config.defaultHeight || 300

    // Window chrome (title bar + borders) takes space from the outer window size.
    // macOS standard title bar: ~28px, Windows: ~32px.
    // We add a buffer so the webview content area fits the measured content.
    const chromeBuffer = 32
    const targetOuterHeight = Math.ceil(measuredHeight) + chromeBuffer
    const height = Math.max(minHeight, Math.min(targetOuterHeight, maxHeight))

    const win = getCurrentWebviewWindow()

    await win.setSize(new LogicalSize(width, height))

    const { x, y } = await calculateWindowPosition(width, height)
    await win.setPosition(new LogicalPosition(x, y))

    await win.show()
    console.log(`[NoticeLayout] Auto-sized window to ${width}x${height} (content=${Math.ceil(measuredHeight)}, chrome=${chromeBuffer})`)
  } catch (error) {
    console.error('[NoticeLayout] Failed to auto-size, showing window as-is:', error)
    try {
      const win = getCurrentWebviewWindow()
      await win.show()
    } catch {
      // Nothing more we can do
    }
  }
}

interface NoticeLayoutProps {
  children: (message: MessageType) => ReactNode
  onLoad?: (message: MessageType) => void
  onClose?: (message: MessageType) => void
}

/**
 * Layout component for notice windows.
 * Loads the message from database/URL and provides it to children via render prop.
 *
 * When autoSize is enabled (default: true):
 * - Window is created hidden (visible: false)
 * - windowReady starts as false — children should NOT use h-screen/flex-1 during this phase
 * - After content renders at natural height, the container is measured
 * - Window is resized to fit, repositioned, then shown
 * - windowReady becomes true — children should apply h-screen/flex-1 to fill the window
 *
 * Use useNoticeWindowContext() in child components to read windowReady.
 */
export const NoticeLayout = ({ children, onLoad, onClose }: NoticeLayoutProps) => {
  const [message, setMessage] = useState<MessageType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windowReady, setWindowReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const measuredRef = useRef(false)

  const config = getNoticeConfig()
  const autoSize = config.autoSize ?? true

  // If autoSize is disabled, window is already visible — mark ready immediately
  useEffect(() => {
    if (!autoSize) {
      setWindowReady(true)
    }
  }, [autoSize])

  // Load message from database
  useEffect(() => {
    const loadMessage = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const messageId = urlParams.get('id')

        if (!messageId) {
          setError('No message ID provided')
          setLoading(false)
          setTimeout(async () => {
            try {
              const win = getCurrentWebviewWindow()
              await win.close()
            } catch (err) {
              console.error('Failed to close window:', err)
            }
          }, 1000)
          return
        }

        const storedMessage = await getMessage(messageId)

        if (!storedMessage) {
          console.log(`Message ${messageId} not found in database, closing window`)
          setError('Message not found')
          setLoading(false)
          setTimeout(async () => {
            try {
              const win = getCurrentWebviewWindow()
              await win.close()
            } catch (err) {
              console.error('Failed to close window:', err)
            }
          }, 500)
          return
        }

        setMessage(storedMessage)
        setLoading(false)

        if (onLoad) {
          onLoad(storedMessage)
        }
      } catch (err) {
        console.error('Failed to load message:', err)
        setError('Failed to load message')
        setLoading(false)
        setTimeout(async () => {
          try {
            const win = getCurrentWebviewWindow()
            await win.close()
          } catch (closeErr) {
            console.error('Failed to close window:', closeErr)
          }
        }, 1000)
      }
    }

    loadMessage()
  }, [onLoad])

  // Auto-size: after content renders at natural height (no h-screen constraint),
  // measure the container and resize the window to fit.
  //
  // Approach: temporarily set the container to position:fixed + height:auto so it is
  // completely detached from the document flow. This bypasses ALL ancestor height
  // constraints (body { height:100vh }, Ant Design wrappers, Next.js root divs, etc.)
  // and lets the container shrink-wrap to its children's natural height.
  useEffect(() => {
    if (!autoSize || !message || windowReady || measuredRef.current) return

    let innerFrameId: number | undefined

    // Two rAF frames: first ensures paint, second ensures layout is fully settled
    const outerFrameId = requestAnimationFrame(() => {
      innerFrameId = requestAnimationFrame(() => {
        if (!containerRef.current || measuredRef.current) return
        measuredRef.current = true

        const container = containerRef.current
        const currentConfig = getNoticeConfig()
        const measuredWidth = currentConfig.defaultWidth || 400

        // Save current inline styles
        const saved = {
          position: container.style.position,
          top: container.style.top,
          left: container.style.left,
          width: container.style.width,
          height: container.style.height,
          overflow: container.style.overflow,
        }

        // Detach from document flow for accurate measurement.
        // position:fixed removes all ancestor constraints.
        // width is set to the target window width so text wraps correctly.
        // height:auto lets the container size to its content.
        container.style.position = 'fixed'
        container.style.top = '0'
        container.style.left = '0'
        container.style.width = `${measuredWidth}px`
        container.style.height = 'auto'
        container.style.overflow = 'visible'

        // Force synchronous layout recalculation
        void container.offsetHeight

        // scrollHeight is the most reliable measure of total content height
        const contentHeight = container.scrollHeight

        console.log(`[NoticeLayout] Measured content height: ${contentHeight}px (container detached at ${measuredWidth}px width)`)

        // Restore original styles before the async resize
        container.style.position = saved.position
        container.style.top = saved.top
        container.style.left = saved.left
        container.style.width = saved.width
        container.style.height = saved.height
        container.style.overflow = saved.overflow

        resizeAndShowWindow(contentHeight).then(() => {
          setWindowReady(true)
        })
      })
    })

    return () => {
      cancelAnimationFrame(outerFrameId)
      if (innerFrameId !== undefined) {
        cancelAnimationFrame(innerFrameId)
      }
    }
  }, [autoSize, message, windowReady])

  // Fallback: show window even if measurement fails
  useEffect(() => {
    if (!autoSize || windowReady) return

    const timeoutMs = config.autoSizeTimeout ?? 3000
    const timeoutId = setTimeout(async () => {
      if (!windowReady) {
        console.warn('[NoticeLayout] Auto-size timeout reached, showing window as-is')
        try {
          const win = getCurrentWebviewWindow()
          await win.show()
        } catch {
          // Nothing more we can do
        }
        setWindowReady(true)
      }
    }, timeoutMs)

    return () => clearTimeout(timeoutId)
  }, [autoSize, windowReady, config.autoSizeTimeout])

  // Handle window close event
  useEffect(() => {
    if (!message || !onClose) return

    const handleBeforeUnload = () => {
      onClose(message)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [message, onClose])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ef4444'
      }}>
        {error}
      </div>
    )
  }

  if (!message) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ef4444'
      }}>
        Closing window...
      </div>
    )
  }

  // Measurement phase (windowReady=false):
  //   - Container has no height → renders at natural content height
  //   - Children receive windowReady=false via context → must NOT apply h-screen/flex-1
  //
  // Display phase (windowReady=true):
  //   - Container gets height:100vh to fill the resized window
  //   - Children receive windowReady=true → can apply h-screen/flex-1
  return (
    <NoticeWindowContext.Provider value={{ windowReady }}>
      <div
        ref={containerRef}
        style={windowReady ? { height: '100vh' } : undefined}
      >
        {children(message)}
      </div>
    </NoticeWindowContext.Provider>
  )
}
