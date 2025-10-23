# MessageQueue Documentation

## Overview

The MessageQueue is a persistent notification queue system that manages the display of notification windows in the Tauri desktop application. It ensures notifications are shown one at a time, persist across app restarts, and maintain proper state throughout their lifecycle.

**🔄 Now powered by Zustand with zustand-sync for cross-window state synchronization!**

The system uses [Zustand](https://github.com/pmndrs/zustand) with [zustand-sync](https://github.com/mayank1513/zustand-sync) to synchronize state across all Tauri windows (main window and notice windows). This ensures that all windows see the same queue state in real-time.

> **Note:** For detailed information about the Zustand-sync implementation, see [ZUSTAND_SYNC_INTEGRATION.md](./ZUSTAND_SYNC_INTEGRATION.md)

## Architecture

### Core Components

```
┌───────────────────────────────────────────────────────────────────┐
│                   Cross-Window Message Flow                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  WebSocket Server                                                 │
│       │                                                           │
│       ↓                                                           │
│  SocketManager (Main Window)                                      │
│       │                                                           │
│       ↓                                                           │
│  Zustand Store.enqueue() ──────────────┐                          │
│       │                                │                          │
│       ├──► Dexie Database (Persist)    │                          │
│       │                                │                          │
│       └──► localStorage (zustand-sync)◄┘                          │
│                    │                                              │
│       ┌────────────┼────────────┐                                 │
│       ▼            ▼            ▼                                 │
│  Main Window   Notice Win 1  Notice Win 2                         │
│  (Zustand)     (Zustand)     (Zustand)                            │
│       │            │            │                                 │
│       └────────────┴────────────┘                                 │
│              All windows see same state!                          │
│                    │                                              │
│                    ↓                                              │
│           Store.showNext() triggers                               │
│                    │                                              │
│                    ↓                                              │
│           createNoticeWindow()                                    │
│                    │                                              │
│                    ↓                                              │
│           User Action (OK/Close                                   │
│                    │                                              │
│                    ↓                                              │
│           Store.clearCurrent()                                    │
│                    │                                              │
│                    ↓                                              │
│           State synced to all windows                             │
│                    │                                              │
│                    ↓                                              │
│           Next message shown                                      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Message Lifecycle States

Messages progress through the following states:

1. **pending**: Message is in queue, waiting to be shown
2. **showing**: Message window is currently displayed
3. **shown**: User has acknowledged the message
4. **hidden**: Server requested to hide the message

## API Reference

### Store: useMessageQueueStore

A Zustand store that manages the notification queue with persistence and cross-window synchronization.

**Import:**
```typescript
import { useMessageQueueStore } from '@/stores/messageQueueStore'
```

**Usage:**
```typescript
// In React components (hooks)
const { enqueue, queue, currentMessage } = useMessageQueueStore()

// In utility functions (getState)
const store = useMessageQueueStore.getState()
await store.enqueue(message)
```

#### Store Actions

##### `async enqueue(message: MessageType): Promise<void>`

Adds a new message to the queue and persists it to the database.

**Parameters:**
- `message` - The message object to enqueue

**Example:**
```typescript
// In React component
const { enqueue } = useMessageQueueStore()
await enqueue({
  id: '123',
  title: 'New Announcement',
  type: 'announcement',
  data: { content: 'Hello World' },
  uuid: 'uuid-123'
})

// In utility function
await useMessageQueueStore.getState().enqueue(message)
```

**Behavior:**
- Adds message to in-memory queue
- Persists queue state to Dexie
- Syncs to all windows via localStorage
- Auto-shows message if queue is idle

---

##### `async showNext(): Promise<void>`

Displays the next message in the queue.

**Example:**
```typescript
await useMessageQueueStore.getState().showNext()
```

**Behavior:**
- Skips if already processing a message
- Dequeues next message from queue
- Updates message status to 'showing' in database
- Triggers window creation via store subscription

---

##### `clearCurrent(): void`

Clears the current message and shows the next one.

**Example:**
```typescript
useMessageQueueStore.getState().clearCurrent()
```

**Behavior:**
- Clears current message reference
- Resets processing flag
- Syncs state to all windows
- Automatically shows next message if queue has more

---

##### `async initializeFromDatabase(): Promise<void>`

Restores pending messages from database on app startup.

**Example:**
```typescript
// In SocketManager
const { initializeFromDatabase } = useMessageQueueStore()
await initializeFromDatabase()
```

**Behavior:**
- Prevents duplicate initialization
- Queries database for pending messages
- Restores messages to in-memory queue
- Syncs restored state to all windows
- Auto-shows first message if any exist

---

##### `async persistQueue(): Promise<void>`

Saves current queue state to database.

**Example:**
```typescript
await useMessageQueueStore.getState().persistQueue()
```

**Behavior:**
- Updates queue position for all messages in queue
- Called automatically by `enqueue()`

---

##### `async clearOnLogout(): Promise<void>`

Clears all pending messages when user logs out.

**Example:**
```typescript
// In AuthContext logout
await useMessageQueueStore.getState().clearOnLogout()
```

**Behavior:**
- Clears in-memory queue in all windows
- Deletes pending/showing messages from database
- Clears active window tracking
- Resets initialization flag

#### Store State

##### `queue: MessageType[]`

Array of pending messages.

**Example:**
```typescript
const queue = useMessageQueueStore((state) => state.queue)
console.log(`${queue.length} messages pending`)
```

---

##### `currentMessage: MessageType | null`

The message currently being displayed.

**Example:**
```typescript
const currentMessage = useMessageQueueStore((state) => state.currentMessage)
if (currentMessage?.id === targetId) {
  // Handle specific message
}
```

---

##### `isProcessing: boolean`

Whether a message is currently being shown.

**Example:**
```typescript
const isProcessing = useMessageQueueStore((state) => state.isProcessing)
```

---

##### `activeWindowIds: string[]`

IDs of currently open notice windows.

**Example:**
```typescript
const { isWindowActive } = useMessageQueueStore.getState()
if (isWindowActive(messageId)) {
  console.log('Window already open')
}
```

## Database Schema

### StoredMessage Interface

```typescript
interface StoredMessage extends MessageType {
  timestamp: string              // ISO timestamp of when message was saved
  isRead: boolean                // Whether message has been read
  isShown: boolean               // Whether message has been shown
  message?: string               // Optional message content
  is_shown?: boolean             // Legacy field
  queueStatus: 'pending' | 'showing' | 'shown' | 'hidden'
  queuePosition: number          // Position in queue (0-based)
}
```

### Database Functions

#### `getPendingMessages(): Promise<StoredMessage[]>`
Retrieves all messages with `queueStatus === 'pending'`, sorted by `queuePosition`.

#### `updateQueueStatus(id, status): Promise<void>`
Updates the queue status for a specific message.

#### `markAsShown(id): Promise<void>`
Marks a message as shown (sets `queueStatus = 'shown'`).

#### `markAsHidden(id): Promise<void>`
Marks a message as hidden from server hide event.

#### `clearPendingMessages(): Promise<void>`
Deletes all messages with status 'pending' or 'showing'.

## Usage Examples

### Basic Setup

```typescript
// In SocketManager.tsx
import { useMessageQueueStore } from '@/stores/messageQueueStore'
import { initializeNoticeWindowSystem } from '@/utils/noticeWindow'

const { initializeFromDatabase } = useMessageQueueStore()

// 1. Initialize the notice window system (sets up store subscription)
initializeNoticeWindowSystem()

// 2. Initialize queue from database (restore pending messages)
await initializeFromDatabase()

// The store subscription automatically creates windows when currentMessage changes
```

### Handling Incoming Messages

```typescript
// In SocketManager
import { useMessageQueueStore } from '@/stores/messageQueueStore'

const { enqueue } = useMessageQueueStore()

const showMessage = async (message: MessageType) => {
  // Check if message already exists
  const exists = await hasMessage(message.id)
  
  if (!exists) {
    // Save new message to database
    await saveMessage(message)
  }
  
  // Add to queue (auto-shows if idle, syncs to all windows)
  await enqueue(message)
}

socket.on('message', (data) => {
  const content = JSON.parse(data)
  showMessage(content)
})
```

### Handling User Actions

```typescript
// In notice page component
const handleOk = async () => {
  if (message?.id) {
    // Mark as noticed in backend
    await markAsNoticed.mutateAsync({ id: message.id })
    
    // Close window with proper cleanup
    await closeNoticeWindow(message.id)
  }
}
```

### Handling Server Hide Events

```typescript
// In SocketManager
import { useMessageQueueStore } from '@/stores/messageQueueStore'

const currentMessage = useMessageQueueStore((state) => state.currentMessage)

socket.on('hide', (data) => {
  const hideMessage = JSON.parse(data)
  
  // Close the window
  await closeNoticeWindow(hideMessage.message_id)
  
  // Mark as hidden in database
  await markAsHidden(hideMessage.message_id)
  
  // Clear current and show next (synced to all windows)
  if (currentMessage?.id === hideMessage.message_id) {
    useMessageQueueStore.getState().clearCurrent()
  }
})
```

### Logout Cleanup

```typescript
// In AuthContext
import { useMessageQueueStore } from '@/stores/messageQueueStore'

const logout = async () => {
  // Clear all pending messages (synced to all windows)
  await useMessageQueueStore.getState().clearOnLogout()
  
  // Clear auth state
  await clearAuthState()
  
  // Redirect
  router.push('/')
}
```

## Persistence Strategy

### On App Startup
1. `initializeFromDatabase()` is called
2. All messages with `queueStatus === 'pending'` are loaded
3. Messages are sorted by `queuePosition`
4. Queue is restored and first message is shown

### On Message Received
1. Message is saved to database with `queueStatus = 'pending'`
2. Message is added to in-memory queue
3. Queue positions are updated in database
4. If idle, message is shown immediately

### On Message Shown
1. Message status updated to `queueStatus = 'showing'`
2. Window is created and displayed
3. Current message is tracked

### On User Action
1. Message is marked as noticed in backend
2. `closeNoticeWindow()` is called
3. Window destroyed event triggers cleanup
4. Message marked as `queueStatus = 'shown'` in database
5. `clearCurrent()` is called
6. Next message is shown

### On Logout
1. All pending/showing messages are deleted from database
2. In-memory queue is cleared
3. No messages survive logout

## Design Decisions

### Why Zustand with zustand-sync?
The MessageQueue uses Zustand with zustand-sync to ensure:
- **Cross-Window Sync**: All Tauri windows (main + notice windows) see the same state
- **Real-time Updates**: State changes propagate instantly via localStorage
- **Single Source of Truth**: One centralized store across the entire application
- **React Integration**: Seamless hooks for components, getState() for utilities
- **Performance**: Selective subscriptions prevent unnecessary re-renders
- **Window Isolation**: Each window has its own context but shares state

### Why Persist to Dexie?
- **Reliability**: Messages survive app crashes/restarts
- **User Experience**: No lost notifications
- **Offline Support**: Queue works without network
- **Performance**: IndexedDB is fast for local queries

### Why One Message at a Time?
- **Focus**: User can give full attention to each notification
- **Simplicity**: No complex window positioning logic
- **Clarity**: Clear which message requires action

### Why Track Queue Position?
- **Order Preservation**: FIFO queue behavior
- **Deterministic**: Same order after restart
- **Debugging**: Easy to see queue state

## Troubleshooting

### Messages Not Showing After Restart

**Check:**
1. Is `initializeFromDatabase()` being called?
2. Are messages in database with `queueStatus = 'pending'`?
3. Is the `onShow` callback registered?

**Debug:**
```typescript
const pending = await getPendingMessages()
console.log('Pending messages:', pending)
```

### OK Button Not Closing Window

**Check:**
1. Is `closeNoticeWindow(message.id)` being called?
2. Is message ID normalized to string?
3. Is window in `activeWindows` map?

**Debug:**
```typescript
console.log('Active windows:', Array.from(activeWindows.keys()))
console.log('Trying to close:', message.id, typeof message.id)
```

### Messages Duplicating

**Check:**
1. Is `hasMessage()` check working?
2. Is database properly deduplicating by ID?
3. Are messages being re-enqueued on each socket message?

**Debug:**
```typescript
const exists = await hasMessage(message.id)
console.log(`Message ${message.id} exists:`, exists)
```

### Messages Not Clearing on Logout

**Check:**
1. Is `clearOnLogout()` being called in logout handler?
2. Are database queries succeeding?
3. Is error being caught and ignored?

**Debug:**
```typescript
await useMessageQueueStore.getState().clearOnLogout()
const remaining = await getPendingMessages()
console.log('Messages after logout:', remaining.length)

// Check store state in all windows
console.log('Store state:', useMessageQueueStore.getState())
```

## Performance Considerations

### Database Operations
- All database operations are async and non-blocking
- Queries use indexed fields (`queueStatus`, `queuePosition`)
- Bulk operations (delete, update) are optimized

### Memory Usage
- In-memory queue only stores MessageType objects (lightweight)
- Full message details remain in database until needed
- Queue size is naturally limited by user interaction
- Each window maintains its own Zustand store instance (minimal overhead)

### State Synchronization
- zustand-sync uses localStorage for cross-window communication
- Only changed state is synchronized (not entire store)
- Subscriptions are selective (re-render only when specific state changes)
- No network overhead (all sync is local)

### Window Management
- Only one window is created at a time
- Windows are destroyed after use (no memory leaks)
- Window tracking via activeWindowIds array
- Automatic cleanup on window destroy events

## Future Enhancements

### Potential Improvements
1. **Priority Queue**: Support urgent/low-priority messages
2. **Grouping**: Batch similar messages together
3. **Snooze**: Allow user to defer messages
4. **Categories**: Filter by message type
5. **Sound**: Audio notifications for new messages
6. **Expiration**: Auto-dismiss old messages

### Migration Path
The current architecture supports these enhancements:
- Add priority field to schema (backward compatible)
- Extend queueStatus with new states
- Add methods without breaking existing API

## Related Files

### Core Implementation
- `src/stores/messageQueueStore.ts` - **Zustand store with zustand-sync**
- `src/utils/db/messagesDb.ts` - Database layer (Dexie)
- `src/utils/noticeWindow.ts` - Window management with store subscription
- `src/utils/messageQueue.ts` - **DEPRECATED** (kept for reference)

### Integration Points
- `src/components/extra/SocketManager.tsx` - WebSocket integration
- `src/contexts/AuthContext.tsx` - Logout integration
- `src/app/notices/*/page.tsx` - Notice UI components
- `src/utils/testNotice.ts` - Debug utilities

### Documentation
- `docs/ZUSTAND_SYNC_INTEGRATION.md` - Detailed Zustand-sync guide
- `docs/MESSAGE_QUEUE.md` - This file (overview and API reference)

## Additional Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [zustand-sync Package](https://github.com/mayank1513/zustand-sync)
- [Tauri Multi-Window Guide](https://tauri.app/v2/guides/features/multiwindow/)
- [Dexie.js Documentation](https://dexie.org/)

## License

Part of the internal tools project.

