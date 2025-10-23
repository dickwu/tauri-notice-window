# Zustand-Sync Integration for Cross-Window State Management

## Overview

The MessageQueue system has been migrated from a singleton class pattern to **Zustand with zustand-sync** to enable seamless state synchronization across all Tauri windows (main window and multiple notice windows).

### Why Zustand-Sync?

In Tauri applications, each window is a separate webview with its own JavaScript context. Without synchronization:
- Main window and notice windows have isolated state
- Closing a notice window in one context doesn't update the queue in others
- Multiple windows might show the same notification
- Queue state is lost when windows are closed

**Zustand-sync solves this by:**
- Synchronizing state changes across all windows in real-time
- Using localStorage as the communication bridge
- Providing a single source of truth for the entire application
- Automatic updates when state changes in any window

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cross-Window State Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Main Window                Notice Window 1     Notice Window 2 │
│      │                            │                    │        │
│      ├──── enqueue(msg) ──────────┼────────────────────┼──────► │
│      │                            │                    │        │
│      ▼                            ▼                    ▼        │
│  Zustand Store ◄────────► localStorage ◄────────► Zustand Store │
│      │                            │                    │        │
│      ▼                            ▼                    ▼        │
│  State Updated               State Updated       State Updated  │
│                                                                 │
│  All windows see the same state in real-time!                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Store Structure

### Location
`src/stores/messageQueueStore.ts`

### State Interface

```typescript
interface MessageQueueState {
  // State
  queue: MessageType[]              // Array of pending messages
  currentMessage: MessageType | null // Currently displayed message
  isProcessing: boolean              // Is a message being shown
  initialized: boolean               // Has DB been loaded
  activeWindowIds: string[]          // IDs of open notice windows

  // Actions
  enqueue: (message: MessageType) => Promise<void>
  dequeue: () => MessageType | null
  showNext: () => Promise<void>
  clearCurrent: () => void
  setCurrentMessage: (message: MessageType | null) => void
  setIsProcessing: (processing: boolean) => void
  setQueue: (queue: MessageType[]) => void
  initializeFromDatabase: () => Promise<void>
  persistQueue: () => Promise<void>
  clearOnLogout: () => Promise<void>
  addActiveWindow: (id: string) => void
  removeActiveWindow: (id: string) => void
  isWindowActive: (id: string) => boolean
}
```

### Sync Configuration

```typescript
export const useMessageQueueStore = create<MessageQueueState>()(
  sync(
    (set, get) => ({ /* state and actions */ }),
    {
      name: 'message-queue-store',  // Unique identifier
      storage: 'local',              // Use localStorage for sync
    },
  ),
)
```

## Usage Patterns

### In React Components (Hooks)

```typescript
import { useMessageQueueStore } from '@/stores/messageQueueStore'

function MyComponent() {
  // Subscribe to specific state slices
  const queue = useMessageQueueStore((state) => state.queue)
  const currentMessage = useMessageQueueStore((state) => state.currentMessage)
  
  // Access actions
  const { enqueue, clearCurrent } = useMessageQueueStore()
  
  // Use in event handlers
  const handleNewMessage = async (message: MessageType) => {
    await enqueue(message)
  }
  
  return (
    <div>
      <p>Queue length: {queue.length}</p>
      {currentMessage && <p>Current: {currentMessage.title}</p>}
    </div>
  )
}
```

### In Utility Functions (getState)

```typescript
import { useMessageQueueStore } from '@/stores/messageQueueStore'

export async function someUtilityFunction() {
  // Access store directly without hooks
  const store = useMessageQueueStore.getState()
  
  // Read state
  const queueLength = store.queue.length
  
  // Call actions
  await store.enqueue(message)
  store.clearCurrent()
}
```

### Selective Subscriptions (Performance)

```typescript
import { useMessageQueueStore, messageQueueSelectors } from '@/stores/messageQueueStore'

function QueueDisplay() {
  // Only re-render when queue length changes
  const queueLength = useMessageQueueStore(messageQueueSelectors.queueLength)
  
  return <div>Pending: {queueLength}</div>
}
```

## Window Lifecycle Management

### Main Window

```typescript
// In SocketManager.tsx
useEffect(() => {
  // Initialize window system
  initializeNoticeWindowSystem()
  
  // Restore pending messages from Dexie
  initializeFromDatabase()
}, [])
```

### Notice Windows

```typescript
// Notice windows automatically subscribe to store changes
// When created, they're tracked in activeWindowIds

// On window close:
noticeWindow.once('tauri://destroyed', async () => {
  const store = useMessageQueueStore.getState()
  
  // Remove from active windows
  store.removeActiveWindow(messageId)
  
  // Mark as shown
  await markAsShown(messageId)
  
  // Show next message
  store.clearCurrent()
})
```

### Window Detection

```typescript
// Check if a notice is already displayed
const isActive = useMessageQueueStore.getState().isWindowActive(messageId)

if (isActive) {
  console.log('Window already open for this message')
}
```

## State Synchronization Flow

### 1. Message Arrives via WebSocket

```
SocketManager (Main Window)
    ↓
  enqueue(message)
    ↓
Zustand Store Updates
    ↓
zustand-sync writes to localStorage
    ↓
All windows' stores update automatically
    ↓
Notice window created (via subscription)
```

### 2. User Clicks OK Button

```
Notice Window (Any Window)
    ↓
  closeNoticeWindow()
    ↓
  clearCurrent()
    ↓
Zustand Store Updates
    ↓
zustand-sync writes to localStorage
    ↓
All windows' stores update
    ↓
Next message shown (via subscription)
```

### 3. Server Hide Event

```
SocketManager (Main Window)
    ↓
  hideNotice(messageId)
    ↓
  closeNoticeWindow(messageId)
    ↓
  clearCurrent()
    ↓
All windows synchronized
```

## Migration from Old MessageQueue

### Before (Singleton)

```typescript
import { messageQueue } from '@/utils/messageQueue'

// Usage
messageQueue.enqueue(message)
const current = messageQueue.getCurrentMessage()
messageQueue.clearCurrent()
```

### After (Zustand)

```typescript
import { useMessageQueueStore } from '@/stores/messageQueueStore'

// In React components
const { enqueue, currentMessage, clearCurrent } = useMessageQueueStore()

// In utilities
const store = useMessageQueueStore.getState()
await store.enqueue(message)
const current = store.currentMessage
store.clearCurrent()
```

## Debugging

### Browser Console Tools

```javascript
// Test notification
window.testNotice()

// Check queue status
window.queueStatus()
// Output: { queueLength, currentMessage, activeWindows, isProcessing }

// Reset stuck queue
window.resetQueue()

// Direct store access
window.messageQueueStore.getState()
```

### Chrome DevTools

1. Open DevTools in main window
2. Navigate to **Application** → **Local Storage**
3. Find `message-queue-store` key
4. See synchronized state in real-time

### Multi-Window Testing

```javascript
// Window 1 (Main)
await window.testNotice()

// Window 2 (Notice)
window.queueStatus()
// Should see the same state!

// Close notice window
// Check Window 1:
window.queueStatus()
// State updated automatically
```

## Performance Considerations

### Subscription Optimization

```typescript
// ❌ Bad - Re-renders on any state change
const store = useMessageQueueStore()

// ✅ Good - Only re-renders when queue changes
const queue = useMessageQueueStore((state) => state.queue)

// ✅ Better - Use selectors
const queueLength = useMessageQueueStore(messageQueueSelectors.queueLength)
```

### Avoid Unnecessary Syncs

```typescript
// For temporary state, use local useState
const [localState, setLocalState] = useState()

// Only sync critical cross-window state
const { queue, currentMessage } = useMessageQueueStore()
```

### Batch Updates

```typescript
// ❌ Bad - Multiple syncs
store.setQueue([])
store.setCurrentMessage(null)
store.setIsProcessing(false)

// ✅ Good - Single sync
store.clearOnLogout() // Updates multiple fields at once
```

## Troubleshooting

### State Not Syncing Between Windows

**Check:**
1. Is localStorage accessible in both windows?
2. Are both windows using the same store name?
3. Check browser console for errors

**Debug:**
```javascript
// In each window
console.log(localStorage.getItem('message-queue-store'))
```

### Stale State After Window Close

**Check:**
1. Is `removeActiveWindow()` being called?
2. Is window cleanup in `tauri://destroyed` event?

**Fix:**
```typescript
// Ensure cleanup is registered
noticeWindow.once('tauri://destroyed', () => {
  useMessageQueueStore.getState().removeActiveWindow(id)
})
```

### Duplicate Notifications

**Check:**
1. Is `isWindowActive()` checked before creating window?
2. Are window IDs normalized to string?

**Fix:**
```typescript
const normalizedId = String(messageId)
if (!useMessageQueueStore.getState().isWindowActive(normalizedId)) {
  createNoticeWindow(message)
}
```

## Best Practices

### 1. Always Use getState() in Utilities

```typescript
// ✅ Good
export function utilityFunction() {
  const store = useMessageQueueStore.getState()
  store.enqueue(message)
}

// ❌ Bad - Hooks only work in React components
export function utilityFunction() {
  const { enqueue } = useMessageQueueStore()  // Error!
}
```

### 2. Normalize IDs Consistently

```typescript
// Always normalize message IDs to strings
const normalizedId = String(message.id)
store.addActiveWindow(normalizedId)
activeWindows.set(normalizedId, window)
```

### 3. Subscribe to Minimal State

```typescript
// ✅ Good - Specific slice
const currentMessage = useMessageQueueStore((state) => state.currentMessage)

// ❌ Bad - Entire store
const store = useMessageQueueStore()
```

### 4. Clean Up Window Tracking

```typescript
// Always remove from activeWindowIds on close
noticeWindow.once('tauri://destroyed', () => {
  store.removeActiveWindow(messageId)
})
```

### 5. Use Async Actions Properly

```typescript
// ✅ Good - Await async actions
await store.enqueue(message)
await store.initializeFromDatabase()

// ⚠️  Be careful with sync actions
store.clearCurrent() // Synchronous
```

## Related Files

- `src/stores/messageQueueStore.ts` - Main Zustand store
- `src/utils/noticeWindow.ts` - Window management with store subscription
- `src/components/extra/SocketManager.tsx` - WebSocket integration
- `src/contexts/AuthContext.tsx` - Logout cleanup
- `src/utils/testNotice.ts` - Debug utilities
- `src/utils/messageQueue.ts` - **DEPRECATED** (kept for reference)

## References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [zustand-sync Package](https://github.com/mayank1513/zustand-sync)
- [Tauri Multi-Window Guide](https://tauri.app/v2/guides/features/multiwindow/)

