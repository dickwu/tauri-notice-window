import type { MessageType } from '../types/message';
/**
 * Hook to open notice windows
 * @returns Object with showNotice function
 */
export declare const useNoticeWindow: () => {
    showNotice: (message: MessageType) => Promise<void>;
};
//# sourceMappingURL=useNoticeWindow.d.ts.map