/**
 * Window position configuration
 */
export interface WindowPosition {
  /** X coordinate (pixels from left edge) */
  x?: number
  /** Y coordinate (pixels from top edge) */
  y?: number
  /** Position preset: 'right-bottom' | 'right-top' | 'left-bottom' | 'left-top' | 'center' */
  position?: 'right-bottom' | 'right-top' | 'left-bottom' | 'left-top' | 'center'
  /** Padding from screen edges in pixels (default: 20) */
  padding?: number
}

/**
 * Core message interface for notice windows
 */
export interface MessageType {
  /** Unique identifier for the message */
  id: string
  /** Title of the notification */
  title: string
  /** Type of message (lowercase), matches router path */
  type: string
  /** Custom data payload for rendering */
  data: any
  /** Minimum width for the notice window */
  min_width?: number
  /** Minimum height for the notice window */
  min_height?: number
  /** Window position configuration (default: right-bottom with 20px padding) */
  windowPosition?: WindowPosition
  /** Whether to show window decorations/title bar (default: true) */
  decorations?: boolean
}

/**
 * Extended message interface for database storage
 */
export interface StoredMessage extends MessageType {
  /** ISO timestamp when message was saved */
  timestamp: string
  /** Whether the message has been read */
  isRead: boolean
  /** Whether the message has been shown */
  isShown: boolean
  /** Current queue status */
  queueStatus: 'pending' | 'showing' | 'shown' | 'hidden'
  /** Position in the queue (0-based) */
  queuePosition: number
}

/**
 * Configuration options for notice windows
 */
export interface NoticeConfig {
  /** Router prefix for notice pages (default: '/notice') */
  routePrefix: string
  /** Database name for persistence (default: 'tauri-notice-db') */
  databaseName: string
  /** Default window width if not specified in message */
  defaultWidth: number
  /** Default window height if not specified in message */
  defaultHeight: number
  /** Custom 404 page URL when windowUrl is invalid (optional) */
  notFoundUrl?: string
  /** Default window decorations/title bar setting (default: true) */
  defaultDecorations?: boolean
  /** 
   * Auto-close timeout in milliseconds when decorations is false (default: 10000)
   * If the window fails to load within this time, it will be automatically closed.
   * Set to 0 to disable auto-close.
   */
  loadTimeout?: number
}

