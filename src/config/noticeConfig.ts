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
  notFoundUrl: '/404', // Default 404 page
  defaultDecorations: true, // Show title bar by default
  loadTimeout: 4000, // Auto-close after 4s if stuck (only when decorations=false)
  autoSize: true, // Auto-size windows based on rendered content
  maxWidth: 600, // Max width when auto-sizing
  maxHeight: 800, // Max height when auto-sizing
  autoSizeTimeout: 3000, // Fallback show timeout if measurement fails
  stackRoute: '/notice/stack', // Route used by shared stack window
  stackWindowLabel: 'notice-stack', // Label for shared stack window
  stackWindowOptions: {
    width: 380,
    height: 520,
    decorations: false,
    resizable: true,
    alwaysOnTop: true,
  },
}

/**
 * Load config from localStorage
 */
const loadConfigFromStorage = (): NoticeConfig => {
  if (typeof window === 'undefined') return defaultConfig
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
  if (typeof window === 'undefined') return
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

