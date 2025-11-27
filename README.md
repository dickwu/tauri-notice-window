# Tauri Notice Window

A reusable React library for cross-window notification management in Tauri v2+ applications.

## Features

- **Cross-Window State Sync**: All Tauri windows (main + notice windows) see the same state via `zustand-sync`
- **Zustand-First Architecture**: Zustand store is the single source of truth at runtime
- **Persistent Queue**: IndexedDB (Dexie) used only for cold storage (app restarts)
- **Clean Data Flow**: Store → Database (one-way dependency, no circular dependencies)
- **One-at-a-Time Display**: Only one notice window shown at a time
- **Customizable Routes**: Configurable router prefix for notice pages
- **URL Validation & 404 Fallback**: Automatic validation with customizable error pages for invalid routes
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

## Tauri Permissions Setup

**IMPORTANT**: Before using this library, you must configure Tauri permissions for notice windows.

Create a capability file in your Tauri project at `src-tauri/capabilities/notice.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "notice",
  "description": "Capability for notice windows",
  "windows": ["notice-*"],
  "permissions": [
    "core:default",
    "core:window:allow-close",
    "core:window:allow-show",
    "core:window:allow-unminimize",
    "core:window:allow-set-always-on-top",
    "core:window:allow-center",
    "core:webview:allow-webview-close"
  ]
}
```

> **Note**: The `"windows": ["notice-*"]` pattern matches all notice windows created by this library based on the message ID (e.g., `notice-123`, `notice-456`).

If your notice windows need to make HTTP requests or access other Tauri plugins, add those permissions as well:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "notice",
  "description": "Capability for notice windows with HTTP access",
  "windows": ["notice-*"],
  "permissions": [
    "core:default",
    "core:window:allow-close",
    "core:window:allow-show",
    "core:window:allow-unminimize",
    "core:window:allow-set-always-on-top",
    "core:window:allow-center",
    "core:webview:allow-webview-close",
    "http:allow-fetch",
    "http:allow-fetch-send",
    "http:allow-fetch-cancel",
    "http:allow-fetch-read-body",
    {
      "identifier": "http:default",
      "allow": [
        {
          "url": "https://your-api-domain.com"
        }
      ]
    }
  ]
}
```

For store/database access in notice windows:

```json
{
  "permissions": [
    "core:default",
    "core:window:allow-close",
    "core:window:allow-show",
    "core:window:allow-unminimize",
    "core:window:allow-set-always-on-top",
    "core:window:allow-center",
    "core:webview:allow-webview-close",
    "store:allow-get",
    "store:allow-save",
    "store:allow-delete",
    "store:allow-reload",
    "store:allow-load"
  ]
}
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
      notFoundUrl: '/404', // custom 404 page when route is invalid (optional)
      defaultDecorations: true, // show window title bar by default (optional)
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

### 4. Create a 404 Error Page (Optional)

If a notice window URL is invalid, the library will automatically show a 404 page. Create a custom 404 component:

```typescript
// app/404/page.tsx or notice/404/page.tsx
import { useCloseNotice } from 'tauri-notice-window'

export default function NotFound() {
  const { closeNotice } = useCloseNotice()

  return (
    <div className="error-container">
      <h1>404 - Page Not Found</h1>
      <p>The requested notice page could not be found.</p>
      <button onClick={closeNotice}>Close</button>
    </div>
  )
}
```

Then configure the 404 URL during initialization:

```typescript
setNoticeConfig({
  routePrefix: '/notice',
  notFoundUrl: '/notice/404', // or '/404' depending on your routing setup
})
```

**How it works:**
- Before creating a WebviewWindow, the library validates the URL
- Invalid URLs (empty, malformed, or wrong protocol) trigger the fallback
- A warning is logged to the console for debugging
- The 404 page is shown instead of a broken window

#### 404 Configuration Examples

**Example 1: Basic Setup with Default 404**

```typescript
import { initializeNoticeSystem, setNoticeConfig } from 'tauri-notice-window'

// Use default /404 fallback
setNoticeConfig({
  routePrefix: '/notice',
  // notFoundUrl defaults to '/404' if not specified
})

initializeNoticeSystem()
```

**Example 2: Custom 404 Route**

```typescript
// With custom 404 page inside notice route
setNoticeConfig({
  routePrefix: '/notice',
  notFoundUrl: '/notice/error',
})

// Create the error page at /notice/error
// app/notice/error/page.tsx
import { useCloseNotice } from 'tauri-notice-window'

export default function NoticeError() {
  const { closeNotice } = useCloseNotice()
  
  return (
    <div className="error-page">
      <h2>Oops! Something went wrong</h2>
      <p>This notification type is not supported.</p>
      <button onClick={closeNotice}>Dismiss</button>
    </div>
  )
}
```

**Example 3: Using External URL as 404 Fallback**

```typescript
// You can use absolute URLs for the 404 page
setNoticeConfig({
  routePrefix: '/notice',
  notFoundUrl: 'https://yourapp.com/error',
})

// Or use Tauri's custom protocol
setNoticeConfig({
  routePrefix: '/notice',
  notFoundUrl: 'tauri://localhost/error',
})
```

**Example 4: Styled 404 Component**

```typescript
// app/notice/404/page.tsx
import { useCloseNotice, useMessageQueue } from 'tauri-notice-window'

export default function NotFound() {
  const { closeNotice } = useCloseNotice()
  const { queueLength } = useMessageQueue()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
    }}>
      <h1 style={{ fontSize: '48px', margin: '0' }}>404</h1>
      <p style={{ fontSize: '18px', color: '#666' }}>
        Invalid notification type
      </p>
      {queueLength > 0 && (
        <p style={{ fontSize: '14px', color: '#999' }}>
          {queueLength} more notification{queueLength > 1 ? 's' : ''} in queue
        </p>
      )}
      <button 
        onClick={closeNotice}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: '#007bff',
          color: 'white',
        }}
      >
        Close
      </button>
    </div>
  )
}
```

**Example 5: URL Validation Scenarios**

The library validates URLs and automatically falls back to 404 in these cases:

```typescript
// These message types will trigger 404 fallback:

// ❌ Empty or undefined type
await showNotice({
  id: '1',
  title: 'Test',
  type: '',  // Empty string → Invalid
  data: {},
})

// ❌ Invalid characters that break URL
await showNotice({
  id: '2',
  title: 'Test',
  type: '../../../etc/passwd',  // Path traversal → Invalid
  data: {},
})

// ❌ If routePrefix is misconfigured
setNoticeConfig({
  routePrefix: '',  // Empty prefix creates invalid URL
})

// ✅ These URLs are VALID:
await showNotice({
  id: '3',
  title: 'Test',
  type: 'announcement',  // Creates: /notice/announcement?id=3
  data: {},
})

// Valid URL patterns:
// - Starts with /
// - Starts with http:// or https://
// - Starts with tauri://
```

**Example 6: Debugging Invalid URLs**

When a URL validation fails, a console warning is logged:

```typescript
// Console output when validation fails:
// ⚠️ Invalid window URL: /notice/?id=123. Using fallback 404 page.

// To debug, check:
setNoticeConfig({
  routePrefix: '/notice',
  notFoundUrl: '/notice/404',
})

// Make sure your message has valid type:
await showNotice({
  id: '123',
  title: 'My Notice',
  type: 'announcement',  // Should match a route in your app
  data: {},
})
```

**Example 7: Next.js App Router Setup**

```typescript
// app/layout.tsx
import { initializeNoticeSystem, setNoticeConfig } from 'tauri-notice-window'

export default function RootLayout({ children }) {
  useEffect(() => {
    setNoticeConfig({
      routePrefix: '/notice',
      notFoundUrl: '/notice/not-found',  // Next.js App Router style
      defaultWidth: 400,
      defaultHeight: 300,
    })
    
    initializeNoticeSystem()
  }, [])

  return <html>{children}</html>
}

// Create: app/notice/not-found/page.tsx
import { useCloseNotice } from 'tauri-notice-window'

export default function NoticeNotFound() {
  const { closeNotice } = useCloseNotice()
  
  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
      <p className="mb-4">The notification page you're looking for doesn't exist.</p>
      <button 
        onClick={closeNotice}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Close Notification
      </button>
    </div>
  )
}
```

**Example 8: React Router Setup**

```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { initializeNoticeSystem, setNoticeConfig } from 'tauri-notice-window'

function App() {
  useEffect(() => {
    setNoticeConfig({
      routePrefix: '/notice',
      notFoundUrl: '/notice/404',
      defaultWidth: 400,
      defaultHeight: 300,
    })
    
    initializeNoticeSystem()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Main app routes */}
        <Route path="/" element={<Home />} />
        
        {/* Notice routes */}
        <Route path="/notice/announcement" element={<AnnouncementNotice />} />
        <Route path="/notice/alert" element={<AlertNotice />} />
        <Route path="/notice/404" element={<NoticeNotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

// NoticeNotFound.tsx
import { useCloseNotice } from 'tauri-notice-window'

export function NoticeNotFound() {
  const { closeNotice } = useCloseNotice()
  
  return (
    <div className="error-container">
      <h1>404 - Notification Not Found</h1>
      <p>This notification type is not recognized.</p>
      <button onClick={closeNotice}>Close</button>
    </div>
  )
}
```

**Example 9: Advanced Error Handling with Logging**

```typescript
// app/notice/error/page.tsx
import { useEffect } from 'react'
import { useCloseNotice, useMessageQueue } from 'tauri-notice-window'

export default function NoticeError() {
  const { closeNotice } = useCloseNotice()
  const { currentMessage } = useMessageQueue()

  useEffect(() => {
    // Log error for debugging
    if (currentMessage) {
      console.error('Invalid notice type:', {
        id: currentMessage.id,
        type: currentMessage.type,
        timestamp: new Date().toISOString(),
      })
      
      // Optional: Send to error tracking service
      // trackError('Invalid Notice Type', { messageId: currentMessage.id })
    }
  }, [currentMessage])

  return (
    <div className="error-page">
      <div className="error-icon">⚠️</div>
      <h1>Unable to Display Notification</h1>
      <p>The notification type "{currentMessage?.type}" is not supported.</p>
      <details>
        <summary>Technical Details</summary>
        <pre>{JSON.stringify(currentMessage, null, 2)}</pre>
      </details>
      <button onClick={closeNotice}>Dismiss</button>
    </div>
  )
}
```

**Example 10: Multi-Environment Configuration**

```typescript
// config/notice.config.ts
export const getNoticeConfig = () => {
  const isDev = process.env.NODE_ENV === 'development'
  
  return {
    routePrefix: '/notice',
    notFoundUrl: isDev 
      ? '/notice/dev-404'  // Detailed error in dev
      : '/notice/404',     // Simple error in production
    defaultWidth: 400,
    defaultHeight: 300,
  }
}

// app/layout.tsx
import { initializeNoticeSystem, setNoticeConfig } from 'tauri-notice-window'
import { getNoticeConfig } from '@/config/notice.config'

export default function RootLayout({ children }) {
  useEffect(() => {
    setNoticeConfig(getNoticeConfig())
    initializeNoticeSystem()
  }, [])

  return <html>{children}</html>
}

// app/notice/dev-404/page.tsx (Development-only)
export default function DevNotFound() {
  const { closeNotice } = useCloseNotice()
  const { currentMessage } = useMessageQueue()
  
  return (
    <div className="dev-error">
      <h1>🔧 Development Error</h1>
      <h2>Invalid Notice Route</h2>
      <div className="error-details">
        <p><strong>Route Attempted:</strong> /notice/{currentMessage?.type}</p>
        <p><strong>Message ID:</strong> {currentMessage?.id}</p>
        <p><strong>Title:</strong> {currentMessage?.title}</p>
      </div>
      <div className="fix-suggestion">
        <h3>How to fix:</h3>
        <ol>
          <li>Create route at: app/notice/{currentMessage?.type}/page.tsx</li>
          <li>Or update message.type to match existing route</li>
        </ol>
      </div>
      <button onClick={closeNotice}>Close</button>
    </div>
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
  decorations?: boolean   // Show window title bar (default: true)
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
  notFoundUrl?: string    // Custom 404 page URL for invalid routes (default: '/404')
  defaultDecorations?: boolean  // Show window title bar by default (default: true)
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
  notFoundUrl: '/error', // Custom 404 page
  defaultDecorations: false, // Hide title bar globally
})
```

**URL Validation:** Before creating a WebviewWindow, the library validates the window URL. If the URL is invalid (empty, malformed, or doesn't start with `/`, `http://`, `https://`, or `tauri://`), it automatically falls back to the `notFoundUrl` and logs a warning.

#### deleteMessageById()

Delete a message by ID. Removes the message from both the runtime queue (Zustand) and persistent storage (IndexedDB).

```typescript
import { deleteMessageById } from 'tauri-notice-window'

await deleteMessageById('message-123')
```

**Behavior:**
- Removes message from queue and database
- If message is currently displayed, window closes automatically
- Next message in queue shows immediately

#### hideMessageById()

Hide a message by ID. Marks the message as hidden in the database and removes it from the queue.

```typescript
import { hideMessageById } from 'tauri-notice-window'

// Typically used for server-triggered hide events
await hideMessageById('message-123')
```

**Behavior:**
- Marks message as hidden in database
- Removes from queue
- Closes window if currently displayed

#### markMessageAsShown()

Mark a message as shown to prevent it from being displayed again.

```typescript
import { markMessageAsShown } from 'tauri-notice-window'

// Manually mark without displaying
await markMessageAsShown('message-123')
```

**Use Case:** When you need to acknowledge a message without showing its window (e.g., user already saw it elsewhere).

### Store Methods (Recommended)

All operations should go through the Zustand store for consistency:

#### store.deleteMessage()

Delete a message completely (from both memory and database).

```typescript
import { useMessageQueueStore } from 'tauri-notice-window'

const store = useMessageQueueStore.getState()
await store.deleteMessage('123')  // Removes from store AND database
```

#### store.hideMessage()

Hide a message (marks as hidden and removes from queue).

```typescript
const store = useMessageQueueStore.getState()
await store.hideMessage('123')  // Marks hidden in DB, removes from queue
```

#### store.removeFromQueue()

Remove a message from queue (memory only, persists position changes).

```typescript
const store = useMessageQueueStore.getState()
await store.removeFromQueue('123')  // Updates queue positions in DB
```

#### store.markMessageAsShown()

Mark a message as shown in database.

```typescript
const store = useMessageQueueStore.getState()
await store.markMessageAsShown('123')  // Prevents re-showing
```

### Database Utilities (Low-Level)

⚠️ **Warning:** Direct database access bypasses the store. Only use these for advanced scenarios where you need to query historical data. For all mutations, use store methods above.

#### initializeDatabase()

Initialize the database (called automatically by `initializeNoticeSystem()`).

```typescript
import { initializeDatabase } from 'tauri-notice-window'

const db = initializeDatabase()
```

#### getMessage()

Retrieve a message by ID.

```typescript
import { getMessage } from 'tauri-notice-window'

const message = await getMessage('123')
```



#### getPendingMessages()

Get all pending messages.

```typescript
import { getPendingMessages } from 'tauri-notice-window'

const pending = await getPendingMessages()
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

### Message Deletion and Queue Management

All message operations go through clean public APIs that internally use the Zustand store.

```typescript
import { 
  useNoticeWindow, 
  deleteMessageById, 
  hideMessageById,
  markMessageAsShown 
} from 'tauri-notice-window'

function NoticeManager() {
  const { showNotice } = useNoticeWindow()

  // Example 1: Delete a message from the queue
  const handleDeleteMessage = async () => {
    await showNotice({ id: '1', title: 'First', type: 'announcement', data: {} })
    await showNotice({ id: '2', title: 'Second', type: 'announcement', data: {} })
    await showNotice({ id: '3', title: 'Third', type: 'announcement', data: {} })

    // Delete message '2' from queue
    await deleteMessageById('2')
    // Result: Message removed from queue and database
    // Console output: "Message 2 was deleted, skipping to next"
  }

  // Example 2: Delete the currently displayed message
  const handleDeleteCurrent = async () => {
    await showNotice({ id: '4', title: 'Current', type: 'announcement', data: {} })
    // Window for message '4' is now open

    // Delete current message
    await deleteMessageById('4')
    // Result: Window closes, next message shows automatically
  }

  // Example 3: Hide a message (server-triggered)
  const handleHideMessage = async (messageId: string) => {
    await hideMessageById(messageId)
    // Marks as hidden in DB + removes from queue + closes window
  }

  // Example 4: Mark as shown without displaying
  const handleMarkAsShown = async (messageId: string) => {
    await markMessageAsShown(messageId)
    // Prevents message from being shown in the future
  }
}
```

**How it works:**
1. All operations update both the store (Zustand) and database (IndexedDB)
2. `deleteMessageById()` removes from both queue and database
3. If deleted message is currently shown, window closes automatically
4. Queue position changes are persisted to database
5. Before showing any message, system verifies it exists in database
6. **Safety Layer:** `NoticeLayout` component auto-closes if message is missing

**API Methods:**
```typescript
// Delete message completely
await deleteMessageById('123')
// → Removes from queue AND database
// → If currently showing, window closes

// Hide message (server-triggered)
await hideMessageById('123')
// → Marks as hidden in database
// → Removes from queue
// → Closes window if open

// Mark as shown
await markMessageAsShown('123')
// → Updates database
// → Prevents future display
```

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

### Custom Window Sizing, Positioning, and Decorations

```typescript
// Default: right-bottom with 20px padding, with title bar
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

// Borderless window (no title bar)
await showNotice({
  id: '129',
  title: 'Borderless',
  type: 'announcement',
  data: { content: 'Custom chrome' },
  decorations: false,  // Hide native title bar
})

// Borderless + custom position
await showNotice({
  id: '130',
  title: 'Toast Style',
  type: 'toast',
  data: { content: 'Quick notification' },
  min_width: 300,
  min_height: 80,
  decorations: false,
  windowPosition: { position: 'right-top', padding: 10 },
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

### Architecture: Zustand-First Design

This library follows a **clean, one-way data flow** architecture:

```
┌─────────────────────────────────────────────────────┐
│  Runtime (While App is Running)                     │
│                                                     │
│  ┌──────────────────────────────────────┐           │
│  │   Zustand Store (Source of Truth)    │           │
│  │  - Queue state                       │           │
│  │  - Current message                   │           │
│  │  - Processing status                 │           │
│  └──────────────┬───────────────────────┘           │
│                 │                                   │
│                 │ Persists to ↓                     │
│                 │                                   │
│  ┌──────────────▼───────────────────────┐           │
│  │   IndexedDB (Dexie)                  │           │
│  │  - Dumb storage layer                │           │
│  │  - No business logic                 │           │
│  │  - Only for cold starts              │           │
│  └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Cold Start (App Restart)                           │
│                                                     │
│  IndexedDB ────loads───► Zustand Store              │
│                          (Back to runtime mode)     │
└─────────────────────────────────────────────────────┘
```

**Key Principles:**
1. **Zustand is the boss** - All operations go through the store
2. **Database is dumb** - Pure storage functions, no knowledge of store
3. **One-way flow** - Store writes to DB, DB never touches store
4. **No circular dependencies** - Clean module boundaries

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
     │                                                   │
     └─────── Persists to IndexedDB ────────────────────┘
                   (for cold starts only)
```

### Message Lifecycle

1. **pending**: Message is in queue, waiting to be shown
2. **showing**: Message window is currently displayed
3. **shown**: User has acknowledged the message
4. **hidden**: Server requested to hide the message

### Persistence Strategy

**At Runtime:**
- All state lives in Zustand store (in-memory)
- Store automatically persists changes to IndexedDB
- Database is just a backup, not actively queried

**On App Restart:**
1. Database is initialized
2. Pending messages are loaded into Zustand store
3. First message is shown automatically
4. Back to runtime mode (Zustand is now the truth)

**Why This Design?**
- **Performance**: No database queries during normal operation
- **Simplicity**: Single source of truth eliminates sync bugs
- **Clean Code**: No circular dependencies, predictable data flow
- **Reliability**: Database only used for cold storage

## Requirements

- Tauri v2.0+
- React 19+
- Modern browsers with IndexedDB support
- **Tauri window permissions configured** (see [Tauri Permissions Setup](#tauri-permissions-setup))

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## Support

For issues and questions, please open an issue on GitHub.

