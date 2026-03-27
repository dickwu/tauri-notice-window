import type { MessageType } from '../types/message';
/**
 * Message Queue Store State Interface
 */
interface MessageQueueState {
    queue: MessageType[];
    currentMessage: MessageType | null;
    isProcessing: boolean;
    initialized: boolean;
    activeWindowIds: string[];
    enqueue: (message: MessageType) => Promise<void>;
    dequeue: () => MessageType | null;
    showNext: () => Promise<void>;
    clearCurrent: () => void;
    setCurrentMessage: (message: MessageType | null) => void;
    setIsProcessing: (processing: boolean) => void;
    setQueue: (queue: MessageType[]) => void;
    initializeFromDatabase: () => Promise<void>;
    persistQueue: () => Promise<void>;
    clearOnLogout: () => Promise<void>;
    removeFromQueue: (messageId: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    hideMessage: (messageId: string) => Promise<void>;
    markMessageAsShown: (messageId: string) => Promise<void>;
    addActiveWindow: (id: string) => void;
    removeActiveWindow: (id: string) => void;
    isWindowActive: (id: string) => boolean;
}
export declare const useMessageQueueStore: import("zustand").UseBoundStore<import("zustand").StoreApi<MessageQueueState>>;
/**
 * Selectors for optimized subscriptions
 */
export declare const messageQueueSelectors: {
    queueLength: (state: MessageQueueState) => number;
    currentMessage: (state: MessageQueueState) => MessageType | null;
    isProcessing: (state: MessageQueueState) => boolean;
    queue: (state: MessageQueueState) => MessageType[];
};
export {};
//# sourceMappingURL=messageQueueStore.d.ts.map