import { type ReactNode } from 'react';
import type { MessageType } from '../types/message';
/**
 * Context provided to all children of NoticeLayout.
 * windowReady is false during the measurement phase (before auto-sizing),
 * and true once the window has been sized and is visible.
 *
 * Consumers should remove viewport-filling constraints (e.g. h-screen, flex-1)
 * when windowReady is false so content can render at its natural height for measurement.
 */
interface NoticeWindowContextType {
    windowReady: boolean;
}
/**
 * Hook for notice window pages to know whether the window has been sized and is visible.
 * Use this to conditionally apply h-screen / flex-1 only after the window is ready.
 *
 * @example
 * const { windowReady } = useNoticeWindowContext()
 * <div className={`flex flex-col ${windowReady ? 'h-screen' : ''}`}>
 */
export declare const useNoticeWindowContext: () => NoticeWindowContextType;
interface NoticeLayoutProps {
    children: (message: MessageType) => ReactNode;
    onLoad?: (message: MessageType) => void;
    onClose?: (message: MessageType) => void;
}
/**
 * Layout component for notice windows.
 * Loads the message from database/URL and provides it to children via render prop.
 *
 * When autoSize is enabled (default: true):
 * - Window is created hidden (visible: false)
 * - windowReady starts as false — children should NOT use h-screen/flex-1 during this phase
 * - After content renders at natural height, the container is measured
 * - Window is resized to fit, repositioned, then shown
 * - windowReady becomes true — children should apply h-screen/flex-1 to fill the window
 *
 * Use useNoticeWindowContext() in child components to read windowReady.
 */
export declare const NoticeLayout: ({ children, onLoad, onClose }: NoticeLayoutProps) => import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=NoticeLayout.d.ts.map