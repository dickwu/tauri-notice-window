import type { WindowPosition } from './message';
/**
 * Stack item stored in the shared stack notice window.
 */
export interface StackedNotification {
    id: string;
    uuid?: string;
    type: string;
    routeType: string;
    title: string;
    data: any;
    receivedAt: number;
}
/**
 * Window options for the shared stack notice window.
 */
export interface NoticeStackWindowOptions {
    width?: number;
    height?: number;
    decorations?: boolean;
    resizable?: boolean;
    alwaysOnTop?: boolean;
    position?: WindowPosition;
}
//# sourceMappingURL=stack.d.ts.map