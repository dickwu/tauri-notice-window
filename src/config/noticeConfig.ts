import type { NoticeConfig } from '../types/message'

/**
 * Global configuration for notice windows
 */
let config: NoticeConfig = {
  routePrefix: '/notice',
  databaseName: 'tauri-notice-db',
  defaultWidth: 400,
  defaultHeight: 300,
}

/**
 * Update notice window configuration
 * @param newConfig - Partial configuration to merge with current config
 */
export const setNoticeConfig = (newConfig: Partial<NoticeConfig>): void => {
  config = { ...config, ...newConfig }
}

/**
 * Get current notice window configuration
 * @returns Current configuration object
 */
export const getNoticeConfig = (): NoticeConfig => {
  return { ...config }
}

