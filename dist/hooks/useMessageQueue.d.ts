/**
 * Hook to access message queue state
 * @returns Queue state information
 */
export declare const useMessageQueue: () => {
    queueLength: number;
    currentMessage: import("..").MessageType | null;
    isProcessing: boolean;
    queue: import("..").MessageType[];
};
//# sourceMappingURL=useMessageQueue.d.ts.map