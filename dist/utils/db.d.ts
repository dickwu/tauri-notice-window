import Dexie, { type Table } from 'dexie';
import type { MessageType, StoredMessage } from '../types/message';
/**
 * Dexie database for message persistence
 */
declare class NoticeDatabase extends Dexie {
    messages: Table<StoredMessage, string>;
    constructor(databaseName: string);
}
/**
 * Initialize the database with the configured name
 */
export declare const initializeDatabase: () => NoticeDatabase;
/**
 * Save a new message to the database
 * @param message - Message to save
 */
export declare const saveMessage: (message: MessageType) => Promise<void>;
/**
 * Check if a message exists in the database
 * @param id - Message ID to check
 * @returns True if message exists
 */
export declare const hasMessage: (id: string) => Promise<boolean>;
/**
 * Check if a message was already shown
 * @param id - Message ID to check
 * @returns True if message was already shown (and should not be shown again)
 */
export declare const isMessageShown: (id: string) => Promise<boolean>;
/**
 * Get all pending messages sorted by queue position
 * @returns Array of pending messages
 */
export declare const getPendingMessages: () => Promise<StoredMessage[]>;
/**
 * Update the queue status of a message
 * @param id - Message ID
 * @param status - New queue status
 */
export declare const updateQueueStatus: (id: string, status: StoredMessage["queueStatus"]) => Promise<void>;
/**
 * Mark a message as shown
 * @param id - Message ID
 */
export declare const markAsShown: (id: string) => Promise<void>;
/**
 * Mark a message as hidden (server-triggered hide)
 * @param id - Message ID
 */
export declare const markAsHidden: (id: string) => Promise<void>;
/**
 * Get a message by ID
 * @param id - Message ID
 * @returns The stored message or undefined
 */
export declare const getMessage: (id: string) => Promise<StoredMessage | undefined>;
/**
 * Delete a message by ID from database only
 * NOTE: This is a low-level function. Use store.removeFromQueue() in application code.
 * @param id - Message ID to delete
 */
export declare const deleteMessageById: (id: string) => Promise<void>;
/**
 * Clear all pending and showing messages
 */
export declare const clearPendingMessages: () => Promise<void>;
/**
 * Update queue positions for multiple messages
 * @param messages - Array of messages with their positions
 */
export declare const updateQueuePositions: (messages: Array<{
    id: string;
    position: number;
}>) => Promise<void>;
export {};
//# sourceMappingURL=db.d.ts.map