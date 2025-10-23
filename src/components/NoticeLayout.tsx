import { useEffect, useState, type ReactNode } from 'react'
import type { MessageType } from '../types/message'
import { getMessage } from '../utils/db'

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
}

/**
 * Layout component for notice windows
 * Loads the message from database/URL and provides it to children
 */
export const NoticeLayout = ({ children, onLoad }: NoticeLayoutProps) => {
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
          return
        }

        // Load message from database
        const storedMessage = await getMessage(messageId)

        if (!storedMessage) {
          setError('Message not found')
          setLoading(false)
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
      }
    }

    loadMessage()
  }, [onLoad])

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

  if (error || !message) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ef4444'
      }}>
        {error || 'Message not found'}
      </div>
    )
  }

  return <>{children(message)}</>
}

