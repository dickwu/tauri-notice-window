import type { MessageType, WindowPosition } from '../types/message';
/**
 * Get logical screen dimensions (accounts for DPI scaling)
 * primaryMonitor().size returns physical pixels; Tauri window APIs expect logical pixels.
 * @returns Object with logical screenWidth and screenHeight
 */
export declare const getLogicalScreenSize: () => Promise<{
    screenWidth: number;
    screenHeight: number;
}>;
/**
 * Calculate window position based on position preset or custom coordinates
 * Uses logical pixels (DPI-aware) for correct placement on HiDPI displays.
 * @param width - Window width in logical pixels
 * @param height - Window height in logical pixels
 * @param positionConfig - Position configuration
 * @returns Object with x and y coordinates in logical pixels
 */
export declare const calculateWindowPosition: (width: number, height: number, positionConfig?: WindowPosition) => Promise<{
    x: number;
    y: number;
}>;
/**
 * Create a new notice window for the given message
 * When autoSize is enabled, the window is created hidden and will be shown
 * by NoticeLayout after content measurement and resize.
 * @param message - Message to display in the window
 */
export declare const createNoticeWindow: (message: MessageType) => Promise<void>;
/**
 * Close a specific notice window by message ID
 * @param messageId - ID of the message whose window should be closed
 */
export declare const closeNoticeWindow: (messageId: string) => Promise<void>;
/**
 * Close all active notice windows
 */
export declare const closeAllNoticeWindows: () => Promise<void>;
/**
 * Initialize the notice window system
 * Sets up store subscription to auto-create windows when currentMessage changes
 */
export declare const initializeNoticeWindowSystem: () => void;
//# sourceMappingURL=noticeWindow.d.ts.map