# Usage Examples

This document provides comprehensive examples for using the `tauri-notice-window` library.

## Table of Contents

- [Basic Setup](#basic-setup)
- [WebSocket Integration](#websocket-integration)
- [Next.js App Router](#nextjs-app-router)
- [React Router](#react-router)
- [Custom Notice Components](#custom-notice-components)
- [Advanced Use Cases](#advanced-use-cases)

## Basic Setup

### 1. Install Dependencies

```bash
npm install tauri-notice-window
```

### 2. Initialize in Main App

```typescript
// app/layout.tsx or App.tsx
import { useEffect } from 'react'
import { initializeNoticeSystem, setNoticeConfig } from 'tauri-notice-window'

export default function RootLayout({ children }) {
  useEffect(() => {
    // Optional: Configure
    setNoticeConfig({
      routePrefix: '/notice',
      databaseName: 'my-app-notices',
      defaultWidth: 450,
      defaultHeight: 350,
    })

    // Initialize
    initializeNoticeSystem()
  }, [])

  return <html>{children}</html>
}
```

## WebSocket Integration

### Real-time Notifications from Server

```typescript
// components/SocketManager.tsx
import { useEffect } from 'react'
import { useNoticeWindow, useHideNotice } from 'tauri-notice-window'
import io from 'socket.io-client'

export function SocketManager() {
  const { showNotice } = useNoticeWindow()
  const { hideNotice } = useHideNotice()

  useEffect(() => {
    const socket = io('wss://your-server.com')

    // Show new notification
    socket.on('notification', async (data) => {
      await showNotice({
        id: data.id,
        title: data.title,
        type: data.type,
        data: data.payload,
        min_width: data.width,
        min_height: data.height,
        windowPosition: {
          position: data.position || 'right-bottom',  // Default to right-bottom
          padding: data.padding || 20,
        },
      })
    })

    // Server-triggered hide
    socket.on('hide_notification', async (data) => {
      await hideNotice(data.message_id)
    })

    return () => socket.disconnect()
  }, [showNotice, hideNotice])

  return null
}
```

## Next.js App Router

### Directory Structure

```
app/
  notice/
    announcement/
      page.tsx
    alert/
      page.tsx
    task/
      page.tsx
    chat/
      page.tsx
```

### Announcement Notice

```typescript
// app/notice/announcement/page.tsx
'use client'

import { NoticeLayout, useCloseNotice } from 'tauri-notice-window'

export default function AnnouncementPage() {
  const { closeNotice } = useCloseNotice()

  return (
    <NoticeLayout>
      {(message) => (
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {message.title}
            </h1>
          </div>
          
          <div className="mb-6 text-gray-700">
            {message.data.content}
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={closeNotice}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </NoticeLayout>
  )
}
```

### Alert Notice

```typescript
// app/notice/alert/page.tsx
'use client'

import { NoticeLayout, useCloseNotice } from 'tauri-notice-window'

export default function AlertPage() {
  const { closeNotice } = useCloseNotice()

  return (
    <NoticeLayout>
      {(message) => (
        <div className="p-6 bg-red-50 rounded-lg border-2 border-red-300">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-red-600 mr-3" fill="currentColor">
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
            <h1 className="text-xl font-bold text-red-900">
              {message.title}
            </h1>
          </div>
          
          <div className="mb-6 text-red-800">
            {message.data.message}
          </div>
          
          <button
            onClick={closeNotice}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Acknowledge
          </button>
        </div>
      )}
    </NoticeLayout>
  )
}
```

### Task Notice

```typescript
// app/notice/task/page.tsx
'use client'

import { useState } from 'react'
import { NoticeLayout, useCloseNotice } from 'tauri-notice-window'

export default function TaskPage() {
  const { closeNotice } = useCloseNotice()
  const [completed, setCompleted] = useState(false)

  const handleComplete = async () => {
    setCompleted(true)
    // Mark as completed in your backend
    await fetch('/api/tasks/complete', {
      method: 'POST',
      body: JSON.stringify({ taskId: message.id }),
    })
    closeNotice()
  }

  return (
    <NoticeLayout>
      {(message) => (
        <div className="p-6 bg-white rounded-lg">
          <h1 className="text-xl font-bold mb-4">{message.title}</h1>
          
          <div className="mb-4">
            <p className="text-gray-700">{message.data.description}</p>
            <p className="text-sm text-gray-500 mt-2">
              Due: {message.data.dueDate}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleComplete}
              disabled={completed}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {completed ? 'Completed' : 'Mark Complete'}
            </button>
            <button
              onClick={closeNotice}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </NoticeLayout>
  )
}
```

## React Router

```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { initializeNoticeSystem } from 'tauri-notice-window'
import AnnouncementNotice from './notices/AnnouncementNotice'
import AlertNotice from './notices/AlertNotice'

function App() {
  useEffect(() => {
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
      </Routes>
    </BrowserRouter>
  )
}
```

## Custom Notice Components

### Interactive Form Notice

```typescript
// notice/survey/page.tsx
import { useState } from 'react'
import { NoticeLayout, useCloseNotice } from 'tauri-notice-window'

export default function SurveyNotice() {
  const { closeNotice } = useCloseNotice()
  const [rating, setRating] = useState(0)

  const handleSubmit = async () => {
    await fetch('/api/survey', {
      method: 'POST',
      body: JSON.stringify({ rating }),
    })
    closeNotice()
  }

  return (
    <NoticeLayout>
      {(message) => (
        <div className="p-6">
          <h1 className="text-xl font-bold mb-4">{message.title}</h1>
          <p className="mb-4">{message.data.question}</p>
          
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setRating(value)}
                className={`w-12 h-12 rounded ${
                  rating === value ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          >
            Submit
          </button>
        </div>
      )}
    </NoticeLayout>
  )
}
```

### Multi-Action Notice

```typescript
// notice/approval/page.tsx
import { NoticeLayout, useCloseNotice } from 'tauri-notice-window'

export default function ApprovalNotice() {
  const { closeNotice } = useCloseNotice()

  const handleAction = async (action: 'approve' | 'reject' | 'defer') => {
    await fetch('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    closeNotice()
  }

  return (
    <NoticeLayout>
      {(message) => (
        <div className="p-6">
          <h1 className="text-xl font-bold mb-4">{message.title}</h1>
          <p className="mb-6">{message.data.description}</p>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleAction('approve')}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Approve
            </button>
            <button
              onClick={() => handleAction('reject')}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Reject
            </button>
            <button
              onClick={() => handleAction('defer')}
              className="px-4 py-2 bg-gray-400 text-white rounded"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </NoticeLayout>
  )
}
```

## Advanced Use Cases

### Queue Status Indicator

```typescript
// components/NotificationIndicator.tsx
import { useMessageQueue } from 'tauri-notice-window'

export function NotificationIndicator() {
  const { queueLength, currentMessage } = useMessageQueue()

  if (queueLength === 0 && !currentMessage) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
      {currentMessage && (
        <div className="text-sm">Showing: {currentMessage.title}</div>
      )}
      {queueLength > 0 && (
        <div className="text-xs mt-1">
          {queueLength} pending notification{queueLength > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
```

### Programmatic Notice Creation

```typescript
// utils/showNotification.ts
import { useMessageQueueStore } from 'tauri-notice-window'

export async function showSuccessNotification(message: string) {
  const store = useMessageQueueStore.getState()
  await store.enqueue({
    id: `success-${Date.now()}`,
    title: 'Success',
    type: 'alert',
    data: { message, level: 'success' },
    min_width: 350,
    min_height: 200,
  })
}

export async function showErrorNotification(error: string) {
  const store = useMessageQueueStore.getState()
  await store.enqueue({
    id: `error-${Date.now()}`,
    title: 'Error',
    type: 'alert',
    data: { message: error, level: 'error' },
    min_width: 400,
    min_height: 250,
  })
}
```

### Logout with Cleanup

```typescript
// hooks/useAuth.ts
import { useHideAllNotices } from 'tauri-notice-window'

export function useAuth() {
  const { hideAllNotices } = useHideAllNotices()

  const logout = async () => {
    // Clear all pending notices
    await hideAllNotices()
    
    // Clear auth state
    localStorage.removeItem('auth_token')
    
    // Redirect
    window.location.href = '/login'
  }

  return { logout }
}
```

### Message Type Routing

```typescript
// Show different notice types dynamically
import { useNoticeWindow } from 'tauri-notice-window'

function NotificationHandler() {
  const { showNotice } = useNoticeWindow()

  const handleNotification = async (event: any) => {
    const messageMap = {
      announcement: 'announcement',
      warning: 'alert',
      task_assigned: 'task',
      message: 'chat',
    }

    await showNotice({
      id: event.id,
      title: event.title,
      type: messageMap[event.type] || 'announcement',
      data: event.payload,
    })
  }

  return <div>...</div>
}
```

## Testing

### Debug Utilities

```typescript
// Add to your dev tools
if (process.env.NODE_ENV === 'development') {
  (window as any).testNotice = async () => {
    const { useMessageQueueStore } = await import('tauri-notice-window')
    const store = useMessageQueueStore.getState()
    
    await store.enqueue({
      id: `test-${Date.now()}`,
      title: 'Test Notification',
      type: 'announcement',
      data: { content: 'This is a test' },
    })
  }
}
```

Then in the browser console:
```javascript
testNotice()
```

