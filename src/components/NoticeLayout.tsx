import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { MessageType } from '../types/message'
import { getMessage } from '../utils/db'
import { getNoticeConfig } from '../config/noticeConfig'
import { calculateWindowPosition } from '../utils/noticeWindow'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

/**
 * Resize and reposition the current window to fit measured content,
 * then show it. Called internally when autoSize is enabled.
 */
const resizeAndShowWindow = async (measuredHeight: number): Promise<void> => {
  try {
    const config = getNoticeConfig()
    const width = config.defaultWidth || 400
    const maxHeight = config.maxHeight ?? 800
    const minHeight = config.defaultHeight || 300

    // Clamp height between min and max
    const height = Math.max(minHeight, Math.min(Math.ceil(measuredHeight), maxHeight))

    const { LogicalSize } = await import('@tauri-apps/api/dpi')
    const win = getCurrentWebviewWindow()

    await win.setSize(new LogicalSize(width, height))

    // Recalculate position so the window stays in its configured position
    const { x, y } = await calculateWindowPosition(width, height)
    const { LogicalPosition } = await import('@tauri-apps/api/dpi')
    await win.setPosition(new LogicalPosition(x, y))

    await win.show()
    console.log(`[NoticeLayout] Auto-sized window to ${width}x${height}`)
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

/**
 * Props for NoticeLayout component
 */
interface NoticeLayoutProps {
  children: (message: MessageType) => ReactNode
  onLoad?: (message: MessageType) => void
  onClose?: (message: MessageType) => void
}

/**
 * Layout component for notice windows.
 * Loads the message from database/URL and provides it to children.
 * When autoSize is enabled, measures rendered content then resizes the window to fit.
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

  // Auto-size: measure content after render and resize window
  useEffect(() => {
    if (!autoSize || !message || windowReady || measuredRef.current) return

    // Wait for next animation frame to ensure children have rendered
    const frameId = requestAnimationFrame(() => {
      if (!containerRef.current || measuredRef.current) return
      measuredRef.current = true

      const rect = containerRef.current.getBoundingClientRect()
      resizeAndShowWindow(rect.height).then(() => {
        setWindowReady(true)
      })
    })

    return () => cancelAnimationFrame(frameId)
  }, [autoSize, message, windowReady])

  // Fallback timeout: show window even if measurement fails
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

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
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

  // When autoSize is enabled:
  // - Before measurement: render at natural height (no constraint) so we can measure
  // - After measurement + resize: switch to h-screen so content fills the resized window
  return (
    <div
      ref={containerRef}
      style={windowReady ? { height: '100vh' } : undefined}
    >
      {children(message)}
    </div>
  )
}
