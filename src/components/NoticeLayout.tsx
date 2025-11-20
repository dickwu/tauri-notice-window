import { useEffect, useState, type ReactNode } from 'react'
import type { MessageType } from '../types/message'
import { getMessage } from '../utils/db'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

/**
 * Props for NoticeLayout component
 */
interface NoticeLayoutProps {
  /**
   * Render function that receives the current message
   */
  children: (message: MessageType) => ReactNode
  /**
   * Optional callback when message is loaded
   */
  onLoad?: (message: MessageType) => void
  /**
   * Optional callback when window is closed
   */
  onClose?: (message: MessageType) => void
}

/**
 * Layout component for notice windows
 * Loads the message from database/URL and provides it to children
 */
export const NoticeLayout = ({ children, onLoad, onClose }: NoticeLayoutProps) => {
  const [message, setMessage] = useState<MessageType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMessage = async () => {
      try {
        // Get message ID from URL query params
        const urlParams = new URLSearchParams(window.location.search)
        const messageId = urlParams.get('id')

        if (!messageId) {
          setError('No message ID provided')
          setLoading(false)
          // Close window after a brief delay to show error
          setTimeout(async () => {
            try {
              const window = getCurrentWebviewWindow()
              await window.close()
            } catch (error) {
              console.error('Failed to close window:', error)
            }
          }, 1000)
          return
        }

        // Load message from database
        const storedMessage = await getMessage(messageId)

        if (!storedMessage) {
          console.log(`Message ${messageId} not found in database, closing window`)
          setError('Message not found')
          setLoading(false)
          // Close window immediately if message doesn't exist
          setTimeout(async () => {
            try {
              const window = getCurrentWebviewWindow()
              await window.close()
            } catch (error) {
              console.error('Failed to close window:', error)
            }
          }, 500)
          return
        }

        setMessage(storedMessage)
        setLoading(false)

        // Call onLoad callback if provided
        if (onLoad) {
          onLoad(storedMessage)
        }
      } catch (err) {
        console.error('Failed to load message:', err)
        setError('Failed to load message')
        setLoading(false)
        // Close window on error
        setTimeout(async () => {
          try {
            const window = getCurrentWebviewWindow()
            await window.close()
          } catch (error) {
            console.error('Failed to close window:', error)
          }
        }, 1000)
      }
    }

    loadMessage()
  }, [onLoad])

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

  return <>{children(message)}</>
}

