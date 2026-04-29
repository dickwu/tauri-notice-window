import type { StackedNotification } from '../types/stack';
export interface PushToNoticeStackInput {
    id: string;
    uuid?: string;
    type: string;
    routeType?: string;
    title: string;
    data: any;
    receivedAt?: number;
}
export declare const ensureStackWindow: () => Promise<void>;
export declare const pushToNoticeStack: (input: PushToNoticeStackInput) => Promise<StackedNotification>;
export declare const closeNoticeStackWindow: () => Promise<void>;
//# sourceMappingURL=noticeStackWindow.d.ts.map