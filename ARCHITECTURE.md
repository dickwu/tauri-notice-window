# Architecture: Zustand-First Design

## Core Principle

> **"The database is a dumb persistence layer. It should never know about the store."**

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME (App is Running)                                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Zustand Store (Single Source of Truth)                  │   │
│  │  ────────────────────────────────────────                │   │
│  │  • queue: MessageType[]                                  │   │
│  │  • currentMessage: MessageType | null                    │   │
│  │  • isProcessing: boolean                                 │   │
│  │  • initialized: boolean                                  │   │
│  │  • activeWindowIds: string[]                             │   │
│  └──────────────────┬───────────────────────────────────────┘   │
│                     │                                           │
│                     │ Persists changes ↓                        │
│                     │                                           │
│  ┌──────────────────▼───────────────────────────────────────┐   │
│  │  IndexedDB (Dexie) - Dumb Storage                        │   │
│  │  ────────────────────────────────                        │   │
│  │  • messages table                                        │   │
│  │  • No business logic                                     │   │
│  │  • Only pure CRUD operations                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  COLD START (App Restart)                                       │
│                                                                 │
│  IndexedDB ──loads pending messages──► Zustand Store            │
│                                       (Back to Runtime Mode)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Message Show Logic

### 1. Enqueue Flow

```typescript
// User calls:
await showNotice(message)

// Internal flow:
┌─────────────────────────────────────────────────────────────────┐
│ useNoticeWindow.showNotice()                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ store.enqueue(message)                                          │
│                                                                 │
│ 1. Check if message already shown in DB                         │
│    └─► if yes: REJECT (prevents duplicates)                     │
│                                                                 │
│ 2. Check if message exists in DB                                │
│    └─► if no: saveMessage() to DB                               │
│                                                                 │
│ 3. Check if already in queue                                    │
│    └─► if no: add to queue array                                │
│                                                                 │
│ 4. persistQueue() - save positions to DB                        │
│                                                                 │
│ 5. Auto-show if idle                                            │
│    └─► if (!isProcessing && !currentMessage)                    │
│        └─► showNext()                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2. ShowNext Flow

```typescript
┌─────────────────────────────────────────────────────────────────┐
│ store.showNext()                                                │
│                                                                 │
│ 1. Guard: Skip if already processing                            │
│    └─► if (isProcessing) return                                 │
│                                                                 │
│ 2. Dequeue next message                                         │
│    └─► const nextMessage = dequeue()                            │
│    └─► if (!nextMessage) return (queue empty)                   │
│                                                                 │
│ 3. VALIDATION: Check message still exists in DB                 │
│    └─► const exists = await getMessage(nextMessage.id)          │
│    └─► if (!exists):                                            │
│        └─► console.log("Message deleted, skipping")             │
│        └─► showNext() (recursive, try next message)             │
│                                                                 │
│ 4. Set as current                                               │
│    └─► set({ currentMessage: nextMessage, isProcessing: true }) │
│                                                                 │
│ 5. Update DB status                                             │
│    └─► updateQueueStatus(id, 'showing')                         │
│    └─► persistQueue()                                           │
│                                                                 │
│ 6. Window created by subscription in noticeWindow.ts            │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Window Creation Flow

```typescript
┌─────────────────────────────────────────────────────────────────┐
│ noticeWindow.ts subscription                                    │
│                                                                 │
│ useMessageQueueStore.subscribe((state) => {                     │
│   if (currentMessage && currentMessage !== previousMessage) {   │
│     createNoticeWindow(currentMessage)                          │
│   }                                                             │
│ })                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ createNoticeWindow(message)                                     │
│                                                                 │
│ 1. Check if window already exists                               │
│    └─► if (store.isWindowActive(id)) return                     │
│                                                                 │
│ 2. Build window URL                                             │
│    └─► `${routePrefix}/${message.type}?id=${message.id}`        │
│                                                                 │
│ 3. Validate URL                                                 │
│    └─► if invalid: use notFoundUrl fallback                     │
│                                                                 │
│ 4. Create WebviewWindow                                         │
│    └─► new WebviewWindow(label, { url, width, height, ... })    │
│                                                                 │
│ 5. Track window                                                 │
│    └─► activeWindows.set(id, window)                            │
│    └─► store.addActiveWindow(id)                                │
│                                                                 │
│ 6. Register destroy handler                                     │
│    └─► window.once('tauri://destroyed', async () => {           │
│        ├─► activeWindows.delete(id)                             │
│        ├─► store.removeActiveWindow(id)                         │
│        ├─► store.markMessageAsShown(id) ← Writes to DB          │
│        └─► store.clearCurrent() ← Triggers next message         │
│        })                                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Delete Flow

```typescript
// User calls:
await deleteMessageById('123')

// Internal flow:
┌─────────────────────────────────────────────────────────────────┐
│ deleteMessageById('123') - Public API                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ store.deleteMessage('123')                                      │
│                                                                 │
│ 1. Delete from database                                         │
│    └─► await deleteMessageById('123')  ← DB function            │
│                                                                 │
│ 2. Remove from queue                                            │
│    └─► await removeFromQueue('123')                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ store.removeFromQueue('123')                                    │
│                                                                 │
│ 1. Filter out from queue array                                  │
│    └─► queue = queue.filter(m => m.id !== '123')                │
│                                                                 │
│ 2. Persist updated positions                                    │
│    └─► await persistQueue()                                     │
│                                                                 │
│ 3. Check if it was the current message                          │
│    └─► if (currentMessage?.id === '123'):                       │
│        └─► clearCurrent() ← Closes window & shows next          │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Clear Current Flow

```typescript
┌─────────────────────────────────────────────────────────────────┐
│ store.clearCurrent()                                            │
│                                                                 │
│ 1. Clear state                                                  │
│    └─► set({ currentMessage: null, isProcessing: false })       │
│                                                                 │
│ 2. Auto-show next                                               │
│    └─► if (queue.length > 0):                                   │
│        └─► showNext() ← Goes back to ShowNext flow              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Guarantees

### 1. **No Duplicates**
```typescript
// In enqueue():
const alreadyShown = await isMessageShown(message.id)
if (alreadyShown) return  // REJECT
```

### 2. **Deleted Messages Skip**
```typescript
// In showNext():
const messageExists = await getMessage(nextMessage.id)
if (!messageExists) {
  await showNext()  // Recursive: try next message
  return
}
```

### 3. **Window Auto-Close on Delete**
```typescript
// In removeFromQueue():
if (currentMessage?.id === messageId) {
  clearCurrent()  // Closes window via destroy handler
}
```

### 4. **Database Validation**
```typescript
// In NoticeLayout component:
const storedMessage = await getMessage(messageId)
if (!storedMessage) {
  // Close window immediately
  window.close()
  return
}
```

## Store Methods vs Direct DB Access

### ✅ USE STORE METHODS (Recommended)

```typescript
// Public API - Clean and simple
await deleteMessageById('123')
await hideMessageById('123')
await markMessageAsShown('123')

// Or via store directly
const store = useMessageQueueStore.getState()
await store.deleteMessage('123')
await store.hideMessage('123')
await store.markMessageAsShown('123')
```

### ❌ AVOID DIRECT DB ACCESS (Low-level)

```typescript
// These are exported but should only be used for historical queries
import { getMessage, getPendingMessages } from 'tauri-notice-window'

const message = await getMessage('123')  // ✅ OK: Read-only query
const pending = await getPendingMessages()  // ✅ OK: Read-only query

// ❌ NEVER do this (bypasses store):
import { deleteMessageById } from './utils/db'
await deleteMessageById('123')  // WRONG: Doesn't update Zustand
```

## Why This Architecture?

### Problems with Old Architecture
```
Database ←──dynamic import──→ Store
         (Circular dependency)
         
• Two sources of truth fighting each other
• Dynamic import hack to "hide" circular dependency
• Race conditions when both try to update
• Vite warnings about module duplication
```

### Benefits of New Architecture
```
Store ──one-way──→ Database
    ↓
  Boss         Servant
    
• Single source of truth (Zustand)
• Clean module boundaries
• No circular dependencies
• Predictable data flow
• Easy to reason about
• Fast (no DB queries at runtime)
```

## Performance Characteristics

### Runtime Operations
- **Enqueue**: O(1) - Add to array + DB write
- **Dequeue**: O(1) - Array shift
- **ShowNext**: O(1) - DB read for validation only
- **Delete**: O(n) - Array filter (n = queue length, typically < 10)

### Database Operations
- **Only for cold storage**: DB writes happen async, don't block UI
- **Validation queries**: Single get by ID (indexed, very fast)
- **No polling**: Store doesn't query DB in runtime mode

## Testing the Flow

```typescript
// Test 1: Normal flow
await showNotice({ id: '1', title: 'First', type: 'alert', data: {} })
// → Message added to queue
// → Window opens immediately
// → User closes window
// → Marked as shown in DB

// Test 2: Queue of 3
await showNotice({ id: '1', title: 'First', type: 'alert', data: {} })
await showNotice({ id: '2', title: 'Second', type: 'alert', data: {} })
await showNotice({ id: '3', title: 'Third', type: 'alert', data: {} })
// → Message '1' shows first
// → Close '1' → '2' shows
// → Close '2' → '3' shows

// Test 3: Delete from queue
await showNotice({ id: '1', title: 'First', type: 'alert', data: {} })
await showNotice({ id: '2', title: 'Second', type: 'alert', data: {} })
await deleteMessageById('2')  // Delete before it shows
// → Message '1' shows
// → Close '1' → Queue empty (2 was deleted)
// Console: "Message 2 was deleted, skipping to next"

// Test 4: Delete current message
await showNotice({ id: '1', title: 'Current', type: 'alert', data: {} })
// → Window for '1' is open
await deleteMessageById('1')
// → Window closes immediately
// → Next message shows (if any)

// Test 5: Cold start
// Close app with pending messages
await showNotice({ id: '1', title: 'Pending', type: 'alert', data: {} })
await showNotice({ id: '2', title: 'Pending', type: 'alert', data: {} })
// Close app before showing
// Restart app
await initializeNoticeSystem()
// → Loads messages from DB
// → Message '1' shows automatically
```

## Migration Notes

### Old API → New API

```typescript
// OLD: Direct database calls (bypassed store)
import { deleteMessageById } from 'tauri-notice-window'
await deleteMessageById('123')  // Only deleted from DB

// NEW: Store-first API (updates both)
import { deleteMessageById } from 'tauri-notice-window'
await deleteMessageById('123')  // Updates store + DB
```

The public API remains the same, but the implementation is now correct.

## Conclusion

**The architecture now follows Linus's principle:**

> "Bad programmers worry about the code. Good programmers worry about data structures."

We have clean data structures:
- **Zustand**: Runtime source of truth
- **IndexedDB**: Cold storage backup
- **One-way flow**: Store → Database
- **No circular dependencies**: Clean module boundaries

This makes the code easy to understand, maintain, and debug.
