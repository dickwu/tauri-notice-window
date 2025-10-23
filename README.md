# Tauri Notice Window

A reusable React library for cross-window notification management in Tauri v2+ applications.

## Features

- **Cross-Window State Sync**: All Tauri windows (main + notice windows) see the same state via `zustand-sync`
- **Persistent Queue**: Messages survive app restarts with IndexedDB (Dexie)
- **One-at-a-Time Display**: Only one notice window shown at a time
- **Customizable Routes**: Configurable router prefix for notice pages
- **Type Safety**: Full TypeScript support
- **Easy Integration**: Simple hooks API
- **Tauri v2 Ready**: Uses latest Tauri v2 window APIs

## Installation

```bash
npm install tauri-notice-window
# or
yarn add tauri-notice-window
# or
pnpm add tauri-notice-window
```

## Quick Start

### 1. Initialize the System

In your main app component or layout:

```typescript
import { useEffect } from 'react'
import { initializeNoticeSystem, setNoticeConfig } from 'tauri-notice-window'

function App() {
  useEffect(() => {
    // Optional: Configure before initialization
    setNoticeConfig({
      routePrefix: '/notice',  // default
      databaseName: 'tauri-notice-db',  // default
      defaultWidth: 400, // default width of the notice window
      defaultHeight: 300, // default height of the notice window
    })

    // Initialize the system
    initializeNoticeSystem()
  }, [])

  return <YourApp />
}
```

### 2. Show a Notice

```typescript
import { useNoticeWindow } from 'tauri-notice-window'

function SocketHandler() {
  const { showNotice } = useNoticeWindow()

  const handleMessage = async (data) => {
    await showNotice({
      id: data.id,
      title: data.title,
      type: 'announcement',  // lowercase, matches route
      data: data.content,
      min_width: 400,
      min_height: 300,
    })
  }

  return <div>...</div>
}
```

### 3. Create Notice Pages

Create a route for each message type. For example, `/notice/announcement`:

```typescript
import { NoticeLayout, useCloseNotice } from 'tauri-notice-window'

export default function AnnouncementNotice() {
  const { closeNotice } = useCloseNotice()

  return (
    <NoticeLayout>
      {(message) => (
        <div className="notice-container">
          <h1>{message.title}</h1>
          <div>{message.data.content}</div>
          <button onClick={closeNotice}>OK</button>
        </div>
      )}
    </NoticeLayout>
  )
}
```

## API Reference

### Types

#### MessageType

```typescript
interface MessageType {
  id: string              // Unique message ID
  title: string           // Notice title
  type: string            // Message type (lowercase, matches route)
  data: any               // Custom data payload
  min_width?: number      // Minimum window width
  min_height?: number     // Minimum window height
  windowPosition?: WindowPosition  // Window position (default: right-bottom)
}
```

#### WindowPosition

```typescript
interface WindowPosition {
  x?: number              // X coordinate (pixels from left)
  y?: number              // Y coordinate (pixels from top)
  position?: 'right-bottom' | 'right-top' | 'left-bottom' | 'left-top' | 'center'
  padding?: number        // Padding from screen edges (default: 20px)
}
```

#### NoticeConfig

```typescript
interface NoticeConfig {
  routePrefix: string     // Route prefix (default: '/notice')
  databaseName: string    // Database name (default: 'tauri-notice-db')
  defaultWidth: number    // Default window width (default: 400)
  defaultHeight: number   // Default window height (default: 300)
}
```

### Hooks

#### useNoticeWindow()

Opens a new notice window.

```typescript
const { showNotice } = useNoticeWindow()
await showNotice(message)
```

#### useCloseNotice()

Closes the current notice window (call from within notice page).

```typescript
const { closeNotice } = useCloseNotice()
await closeNotice()
```

#### useHideNotice()

Hides a specific notice by ID (typically for server-triggered hide events).

```typescript
const { hideNotice } = useHideNotice()
await hideNotice(messageId)
```

#### useHideAllNotices()

Clears all pending and active notices.

```typescript
const { hideAllNotices } = useHideAllNotices()
await hideAllNotices()
```

#### useMessageQueue()

Access queue state for UI display.

```typescript
const { queueLength, currentMessage, isProcessing, queue } = useMessageQueue()
```

### Components

#### NoticeLayout

Wrapper component for notice pages that loads the message and provides it to children.

```typescript
interface NoticeLayoutProps {
  children: (message: MessageType) => ReactNode
  onLoad?: (message: MessageType) => void
  onClose?: (message: MessageType) => void
}

<NoticeLayout 
  onLoad={(msg) => console.log('Loaded:', msg)}
  onClose={(msg) => console.log('Closing:', msg)}
>
  {(message) => <YourCustomUI message={message} />}
</NoticeLayout>
```

### Functions

#### initializeNoticeSystem()

Initialize the complete system. Call once during app startup.

```typescript
await initializeNoticeSystem()
```

#### setNoticeConfig()

Configure the notice window system.

```typescript
setNoticeConfig({
  routePrefix: '/notifications',
  databaseName: 'my-app-notices',
  defaultWidth: 500,
  defaultHeight: 400,
})
```

## Routing Setup

The library expects routes to match the pattern: `{routePrefix}/{message.type}`

### Next.js App Router Example

```
app/
  notice/
    announcement/
      page.tsx
    alert/
      page.tsx
    chat/
      page.tsx
```

### React Router Example

```typescript
<Routes>
  <Route path="/notice/announcement" element={<AnnouncementNotice />} />
  <Route path="/notice/alert" element={<AlertNotice />} />
  <Route path="/notice/chat" element={<ChatNotice />} />
</Routes>
```

## Advanced Usage

### Server-Triggered Hide

```typescript
import { useHideNotice } from 'tauri-notice-window'

function SocketHandler() {
  const { hideNotice } = useHideNotice()

  socket.on('hide_message', async (data) => {
    await hideNotice(data.message_id)
  })
}
```

### Logout Cleanup

```typescript
import { useHideAllNotices } from 'tauri-notice-window'

function LogoutButton() {
  const { hideAllNotices } = useHideAllNotices()

  const handleLogout = async () => {
    // Clear all notices
    await hideAllNotices()
    
    // Clear auth and redirect
    await clearAuth()
    navigate('/login')
  }
}
```

### Custom Window Sizing and Positioning

```typescript
// Default: right-bottom with 20px padding
await showNotice({
  id: '123',
  title: 'Default Position',
  type: 'announcement',
  data: { content: 'Appears at right-bottom' },
})

// Custom size
await showNotice({
  id: '124',
  title: 'Large Notice',
  type: 'announcement',
  data: { content: 'Important message' },
  min_width: 800,
  min_height: 600,
})

// Position preset: top-right
await showNotice({
  id: '125',
  title: 'Top Right',
  type: 'alert',
  data: { content: 'Alert message' },
  windowPosition: { position: 'right-top' },
})

// Position preset with custom padding
await showNotice({
  id: '126',
  title: 'Left Bottom',
  type: 'announcement',
  data: { content: 'Custom padding' },
  windowPosition: { 
    position: 'left-bottom',
    padding: 50  // 50px from edges
  },
})

// Custom coordinates
await showNotice({
  id: '127',
  title: 'Custom Position',
  type: 'announcement',
  data: { content: 'Exact position' },
  windowPosition: {
    x: 100,  // 100px from left
    y: 100,  // 100px from top
  },
})

// Centered window
await showNotice({
  id: '128',
  title: 'Centered',
  type: 'announcement',
  data: { content: 'In the middle' },
  windowPosition: { position: 'center' },
})
```

### Queue Status Display

```typescript
import { useMessageQueue } from 'tauri-notice-window'

function QueueIndicator() {
  const { queueLength, currentMessage } = useMessageQueue()

  return (
    <div>
      {queueLength > 0 && (
        <span>Pending notifications: {queueLength}</span>
      )}
      {currentMessage && (
        <span>Currently showing: {currentMessage.title}</span>
      )}
    </div>
  )
}
```

## How It Works

### Cross-Window Synchronization

The library uses `zustand-sync` to synchronize state across all Tauri windows via localStorage. When you enqueue a message in the main window, all notice windows see the update in real-time.

```
Main Window                Notice Window 1        Notice Window 2
     |                            |                      |
     ├── enqueue(msg) ─────────►  │                      │
     │                            │                      │
     ▼                            ▼                      ▼
Zustand Store ◄─────────► localStorage ◄─────────► Zustand Store
     |                            |                      |
     ▼                            ▼                      ▼
State Updated              State Updated          State Updated
```

### Message Lifecycle

1. **pending**: Message is in queue, waiting to be shown
2. **showing**: Message window is currently displayed
3. **shown**: User has acknowledged the message
4. **hidden**: Server requested to hide the message

### Persistence

Messages are persisted to IndexedDB via Dexie. On app restart:
1. Database is initialized
2. Pending messages are loaded
3. First message is shown automatically

## Requirements

- Tauri v2.0+
- React 19+
- Modern browsers with IndexedDB support

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## Support

For issues and questions, please open an issue on GitHub.

