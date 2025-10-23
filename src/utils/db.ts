import Dexie, { type Table } from 'dexie'
import type { MessageType, StoredMessage } from '../types/message'
import { getNoticeConfig } from '../config/noticeConfig'

/**
 * Dexie database for message persistence
 */
class NoticeDatabase extends Dexie {
  messages!: Table<StoredMessage, string>

  constructor(databaseName: string) {
    super(databaseName)
    this.version(1).stores({
      messages: 'id, queueStatus, queuePosition, timestamp',
    })
  }
}

let db: NoticeDatabase | null = null

/**
 * Initialize the database with the configured name
 */
export const initializeDatabase = (): NoticeDatabase => {
  if (!db) {
    const config = getNoticeConfig()
    db = new NoticeDatabase(config.databaseName)
  }
  return db
}

/**
 * Get the database instance
 */
const getDb = (): NoticeDatabase => {
  if (!db) {
    return initializeDatabase()
  }
  return db
}

/**
 * Save a new message to the database
 * @param message - Message to save
 */
export const saveMessage = async (message: MessageType): Promise<void> => {
  const storedMessage: StoredMessage = {
    ...message,
    timestamp: new Date().toISOString(),
    isRead: false,
    isShown: false,
    queueStatus: 'pending',
    queuePosition: 0,
  }
  await getDb().messages.put(storedMessage)
}

/**
 * Check if a message exists in the database
 * @param id - Message ID to check
 * @returns True if message exists
 */
export const hasMessage = async (id: string): Promise<boolean> => {
  const message = await getDb().messages.get(id)
  return !!message
}

/**
 * Get all pending messages sorted by queue position
 * @returns Array of pending messages
 */
export const getPendingMessages = async (): Promise<StoredMessage[]> => {
  return await getDb()
    .messages.where('queueStatus')
    .equals('pending')
    .sortBy('queuePosition')
}

/**
 * Update the queue status of a message
 * @param id - Message ID
 * @param status - New queue status
 */
export const updateQueueStatus = async (
  id: string,
  status: StoredMessage['queueStatus']
): Promise<void> => {
  await getDb().messages.update(id, { queueStatus: status })
}

/**
 * Mark a message as shown
 * @param id - Message ID
 */
export const markAsShown = async (id: string): Promise<void> => {
  await getDb().messages.update(id, {
    queueStatus: 'shown',
    isShown: true,
  })
}

/**
 * Mark a message as hidden (server-triggered hide)
 * @param id - Message ID
 */
export const markAsHidden = async (id: string): Promise<void> => {
  await getDb().messages.update(id, {
    queueStatus: 'hidden',
  })
}

/**
 * Get a message by ID
 * @param id - Message ID
 * @returns The stored message or undefined
 */
export const getMessage = async (id: string): Promise<StoredMessage | undefined> => {
  return await getDb().messages.get(id)
}

/**
 * Clear all pending and showing messages
 */
export const clearPendingMessages = async (): Promise<void> => {
  await getDb()
    .messages.where('queueStatus')
    .anyOf(['pending', 'showing'])
    .delete()
}

/**
 * Update queue positions for multiple messages
 * @param messages - Array of messages with their positions
 */
export const updateQueuePositions = async (
  messages: Array<{ id: string; position: number }>
): Promise<void> => {
  const updates = messages.map((msg) =>
    getDb().messages.update(msg.id, { queuePosition: msg.position })
  )
  await Promise.all(updates)
}

