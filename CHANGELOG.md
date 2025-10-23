# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-01

### Added

- Initial release of `tauri-notice-window`
- Cross-window state synchronization using Zustand with zustand-sync
- Persistent message queue using Dexie (IndexedDB)
- Message lifecycle management (pending → showing → shown → hidden)
- Hooks API:
  - `useNoticeWindow()` - Open notice windows
  - `useCloseNotice()` - Close current notice
  - `useHideNotice()` - Hide specific notice by ID
  - `useHideAllNotices()` - Clear all pending notices
  - `useMessageQueue()` - Access queue state
- `NoticeLayout` component for notice pages
- Configurable router prefix and database name
- TypeScript support with full type definitions
- Automatic window creation and cleanup
- Support for custom window dimensions per message
- One-at-a-time notification display
- Queue persistence across app restarts
- Tauri v2 compatibility

### Features

- **Cross-Window Sync**: All windows see the same state in real-time
- **Persistent Queue**: Messages survive app restarts
- **Type Safety**: Full TypeScript support
- **Easy Integration**: Simple hooks-based API
- **Flexible Rendering**: Custom notice pages via routing
- **Window Management**: Automatic creation, tracking, and cleanup
- **Database Persistence**: IndexedDB storage via Dexie

### Documentation

- Comprehensive README with quick start guide
- Detailed API reference
- Usage examples document (EXAMPLES.md)
- TypeScript type definitions

[1.0.0]: https://github.com/yourusername/tauri-notice-window/releases/tag/v1.0.0

