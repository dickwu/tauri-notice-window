import type { StackedNotification } from '../types/stack';
interface NoticeStackState {
    items: StackedNotification[];
    addItem: (item: StackedNotification) => void;
    removeItem: (id: string) => void;
    clearAll: () => void;
}
export declare const useNoticeStackStore: import("zustand").UseBoundStore<import("zustand").StoreApi<NoticeStackState>>;
export declare const clearNoticeStack: () => void;
export declare const removeFromNoticeStack: (id: string) => void;
export {};
//# sourceMappingURL=noticeStackStore.d.ts.map