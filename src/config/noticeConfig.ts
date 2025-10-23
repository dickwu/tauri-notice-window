import type { NoticeConfig } from '../types/message'

const CONFIG_STORAGE_KEY = 'tauri-notice-config'

/**
 * Default configuration for notice windows
 */
const defaultConfig: NoticeConfig = {
  routePrefix: '/notice',
  databaseName: 'tauri-notice-db',
  defaultWidth: 400,
  defaultHeight: 300,
}

/**
 * Load config from localStorage
 */
const loadConfigFromStorage = (): NoticeConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (stored) {
      return { ...defaultConfig, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.warn('Failed to load config from localStorage:', error)
  }
  return defaultConfig
}

/**
 * Save config to localStorage
 */
const saveConfigToStorage = (config: NoticeConfig): void => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('Failed to save config to localStorage:', error)
  }
}

/**
 * Update notice window configuration
 * @param newConfig - Partial configuration to merge with current config
 */
export const setNoticeConfig = (newConfig: Partial<NoticeConfig>): void => {
  const currentConfig = loadConfigFromStorage()
  const updatedConfig = { ...currentConfig, ...newConfig }
  saveConfigToStorage(updatedConfig)
}

/**
 * Get current notice window configuration
 * @returns Current configuration object
 */
export const getNoticeConfig = (): NoticeConfig => {
  return loadConfigFromStorage()
}

