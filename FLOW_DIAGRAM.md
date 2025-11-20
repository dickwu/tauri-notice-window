# Complete Flow Diagram

## User Perspective (Public API)

```
┌─────────────────────────────────────────────────────────────────┐
│  User Code                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  import {                                                       │
│    showNotice,           // Hook: useNoticeWindow               │
│    deleteMessageById,    // Function: Direct delete             │
│    hideMessageById,      // Function: Server-triggered hide     │
│    markMessageAsShown,   // Function: Manual acknowledgment     │
│  } from 'tauri-notice-window'                                   │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ All operations go through:
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Zustand Store (Runtime Source of Truth)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  store.enqueue(message)          ← showNotice()                 │
│  store.deleteMessage(id)         ← deleteMessageById()          │
│  store.hideMessage(id)           ← hideMessageById()            │
│  store.markMessageAsShown(id)    ← markMessageAsShown()         │
│                                                                  │
│  Internal Methods:                                              │
│  • dequeue()                                                    │
│  • showNext()                                                   │
│  • clearCurrent()                                               │
│  • removeFromQueue()                                            │
│  • persistQueue()                                               │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Persists changes to:
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  IndexedDB (Dexie) - Dumb Storage                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pure CRUD Operations:                                          │
│  • saveMessage(message)                                         │
│  • getMessage(id)                                               │
│  • deleteMessageById(id)                                        │
│  • markAsShown(id)                                              │
│  • markAsHidden(id)                                             │
│  • getPendingMessages()                                         │
│  • updateQueueStatus(id, status)                                │
│  • updateQueuePositions(positions)                              │
│  • clearPendingMessages()                                       │
│                                                                  │
│  ⚠️  No business logic - just storage                            │
│  ⚠️  Never imports store                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Message Flow

### 1. Show Notice Flow

```
┌───────────────┐
│ User Action   │
│ showNotice()  │
└───────┬───────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ store.enqueue(message)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. isMessageShown(id)?                                          │
│    └─► YES: REJECT (prevent duplicate)                          │
│    └─► NO: Continue                                             │
│                                                                  │
│ 2. hasMessage(id)?                                              │
│    └─► NO: saveMessage() to DB                                  │
│    └─► YES: Skip save                                           │
│                                                                  │
│ 3. Already in queue?                                            │
│    └─► NO: Add to queue array                                   │
│    └─► YES: Skip add                                            │
│                                                                  │
│ 4. persistQueue()                                               │
│    └─► updateQueuePositions() in DB                             │
│                                                                  │
│ 5. Auto-show?                                                   │
│    └─► if (!isProcessing && !currentMessage)                    │
│        └─► showNext()                                            │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ store.showNext()                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. Guard: if (isProcessing) return                              │
│                                                                  │
│ 2. nextMessage = dequeue()                                      │
│    └─► Remove from queue array                                  │
│    └─► if (!nextMessage) return                                 │
│                                                                  │
│ 3. Validate: getMessage(id) from DB                             │
│    └─► if (!exists):                                             │
│        └─► console.log("deleted, skipping")                     │
│        └─► showNext() (recursive)                                │
│        └─► return                                                │
│                                                                  │
│ 4. Set as current                                               │
│    └─► currentMessage = nextMessage                             │
│    └─► isProcessing = true                                      │
│                                                                  │
│ 5. Update DB                                                    │
│    └─► updateQueueStatus(id, 'showing')                         │
│    └─► persistQueue()                                            │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ noticeWindow.ts subscription                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ useMessageQueueStore.subscribe((state) => {                     │
│   if (currentMessage !== previousMessage) {                     │
│     createNoticeWindow(currentMessage)                          │
│   }                                                              │
│ })                                                               │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ createNoticeWindow(message)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. Check: isWindowActive(id)?                                   │
│    └─► YES: return (already open)                               │
│                                                                  │
│ 2. Build URL: /notice/{type}?id={id}                            │
│                                                                  │
│ 3. Validate URL                                                 │
│    └─► Invalid: use notFoundUrl                                 │
│                                                                  │
│ 4. new WebviewWindow()                                          │
│                                                                  │
│ 5. Track window                                                 │
│    └─► activeWindows.set(id, window)                            │
│    └─► store.addActiveWindow(id)                                │
│                                                                  │
│ 6. window.once('tauri://destroyed', () => {                     │
│      activeWindows.delete(id)                                   │
│      store.removeActiveWindow(id)                               │
│      store.markMessageAsShown(id) ← Persist to DB               │
│      store.clearCurrent()         ← Show next                   │
│    })                                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Delete Message Flow

```
┌───────────────────┐
│ User Action       │
│ deleteMessageById │
└─────────┬─────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Public API: deleteMessageById(id)                               │
│ └─► store.deleteMessage(id)                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ store.deleteMessage(id)                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. Delete from database                                         │
│    └─► await deleteMessageById(id)  ← DB function               │
│                                                                  │
│ 2. Remove from queue                                            │
│    └─► await removeFromQueue(id)                                │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ store.removeFromQueue(id)                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. Filter from queue                                            │
│    └─► queue = queue.filter(m => m.id !== id)                   │
│                                                                  │
│ 2. Persist positions                                            │
│    └─► await persistQueue()                                     │
│        └─► updateQueuePositions() to DB                         │
│                                                                  │
│ 3. Check current                                                │
│    └─► if (currentMessage?.id === id):                          │
│        └─► clearCurrent()                                        │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ store.clearCurrent()                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. Clear state                                                  │
│    └─► currentMessage = null                                    │
│    └─► isProcessing = false                                     │
│                                                                  │
│ 2. Trigger destroy handler                                      │
│    └─► window.close() via destroy event                         │
│                                                                  │
│ 3. Auto-show next                                               │
│    └─► if (queue.length > 0):                                   │
│        └─► showNext()                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Cold Start Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ App Restart                                                     │
│ initializeNoticeSystem()                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. initializeDatabase()                                         │
│    └─► new NoticeDatabase(databaseName)                         │
│                                                                  │
│ 2. initializeNoticeWindowSystem()                               │
│    └─► Subscribe to store changes                               │
│    └─► Auto-create windows on currentMessage update             │
│                                                                  │
│ 3. store.initializeFromDatabase()                               │
│    └─► Load: getPendingMessages() from DB                       │
│    └─► Set: queue = pendingMessages                             │
│    └─► Auto: showNext() if queue not empty                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                   │
                   └─► Now in Runtime Mode (Zustand is boss)
```

## Data Ownership

```
╔═══════════════════════════════════════════════════════════════╗
║  RUNTIME MODE (App is Running)                                ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  Zustand Store = BOSS                                         ║
║  ────────────────────                                         ║
║  • Owns all state                                             ║
║  • Makes all decisions                                        ║
║  • Controls message lifecycle                                 ║
║  • Triggers window creation/destruction                       ║
║                                                                ║
║           │                                                    ║
║           │ One-way writes                                    ║
║           ▼                                                    ║
║                                                                ║
║  IndexedDB = SERVANT                                          ║
║  ────────────────────                                         ║
║  • Receives updates from store                                ║
║  • Validates message existence on request                     ║
║  • Never modifies store                                       ║
║  • Never makes decisions                                      ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║  COLD START MODE (App Restart)                                ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  IndexedDB → Zustand Store                                    ║
║  ──────────────────────────                                   ║
║  Database loads pending messages into empty store             ║
║                                                                ║
║           │                                                    ║
║           │ One-time load                                     ║
║           ▼                                                    ║
║                                                                ║
║  Back to Runtime Mode                                         ║
║  └─► Zustand is now the boss again                            ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

## Key Design Principles

### 1. Single Source of Truth
```
✅ Runtime: Zustand store is the truth
✅ Cold start: DB loads → Store becomes truth
❌ Never: Two truths fighting each other
```

### 2. One-Way Data Flow
```
✅ Store → Database (always)
❌ Database → Store (never, except cold start)
❌ Database ←→ Store (circular dependency)
```

### 3. Clean Module Boundaries
```
Public API → Store Methods → DB Functions
    ↓            ↓              ↓
  Clean      Business       Dumb
             Logic         Storage
```

### 4. Validation Layers
```
Layer 1: Enqueue - Check if already shown
Layer 2: ShowNext - Validate exists in DB
Layer 3: RemoveFromQueue - Clear if current
Layer 4: NoticeLayout - Fail-safe auto-close
```

## Performance Characteristics

### Runtime Operations (Hot Path)
```
• Enqueue: O(1) + async DB write (non-blocking)
• Dequeue: O(1) array shift
• ShowNext: O(1) + single DB get (indexed)
• Delete: O(n) array filter (n typically < 10)
```

### Database Operations (Cold Path)
```
• Writes are async, don't block UI
• Reads only for validation (single indexed get)
• No polling or subscriptions
• No queries during normal operation
```

### Memory Usage
```
• Queue in memory: ~10 messages typically
• Each message: ~1-2 KB
• Total overhead: < 20 KB for queue state
```

## Error Handling

### Graceful Degradation
```
1. DB unavailable?
   └─► Store continues in memory-only mode
   └─► Messages lost on restart (acceptable)

2. Message deleted?
   └─► Automatically skipped in showNext()
   └─► Console warning logged
   └─► Next message shown

3. Window creation fails?
   └─► Cleanup tracking
   └─► Store clears current
   └─► Try next message

4. NoticeLayout can't load?
   └─► Auto-close window after delay
   └─► Error displayed briefly
```

## Testing Strategy

### Unit Tests
```typescript
// Store methods
✓ enqueue() prevents duplicates
✓ showNext() validates existence
✓ deleteMessage() updates both store and DB
✓ removeFromQueue() clears current if matched

// DB functions
✓ saveMessage() writes correctly
✓ getMessage() retrieves correctly
✓ deleteMessageById() removes correctly
```

### Integration Tests
```typescript
// Flow tests
✓ Show → Close → Show next
✓ Enqueue 3 → Delete middle → Shows 1st and 3rd
✓ Delete current → Window closes → Next shows
✓ Cold start → Loads pending → Shows first
```

### E2E Tests
```typescript
// Real window tests
✓ Window opens for message
✓ Window closes on user action
✓ Next window opens automatically
✓ Duplicate messages rejected
✓ Deleted messages skipped
```
