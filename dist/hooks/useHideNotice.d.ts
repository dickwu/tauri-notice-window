/**
 * Hook to hide a specific notice by ID
 * Typically used for server-triggered hide events
 * @returns Object with hideNotice function
 */
export declare const useHideNotice: () => {
    hideNotice: (messageId: string) => Promise<void>;
};
//# sourceMappingURL=useHideNotice.d.ts.map