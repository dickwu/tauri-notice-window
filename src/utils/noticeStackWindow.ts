import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getNoticeConfig } from '../config/noticeConfig'
import { useNoticeStackStore } from '../stores/noticeStackStore'
import type { StackedNotification } from '../types/stack'
import { calculateWindowPosition } from './noticeWindow'

export interface PushToNoticeStackInput {
  id: string
  uuid?: string
  type: string
  routeType?: string
  title: string
  data: any
  receivedAt?: number
}

const isTauriRuntime = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI__)
}

const emitStackUpdate = async (label: string): Promise<void> => {
  if (!isTauriRuntime()) return
  try {
    const { emit } = await import('@tauri-apps/api/event')
    await emit(`${label}-update`)
  } catch {
    // Ignore emit errors in non-tauri or window teardown timing.
  }
}

export const ensureStackWindow = async (): Promise<void> => {
  if (!isTauriRuntime()) return

  const config = getNoticeConfig()
  const label = config.stackWindowLabel || 'notice-stack'
  const route = config.stackRoute || '/notice/stack'
  const options = config.stackWindowOptions || {}
  const width = options.width ?? 380
  const height = options.height ?? 520
  const decorations = options.decorations ?? false
  const resizable = options.resizable ?? true
  const alwaysOnTop = options.alwaysOnTop ?? true

  const existing = await WebviewWindow.getByLabel(label)
  if (existing) {
    await existing.show()
    await existing.unminimize()
    return
  }

  const { x, y } = await calculateWindowPosition(width, height, options.position)
  new WebviewWindow(label, {
    url: route,
    title: 'Notifications',
    width,
    height,
    x,
    y,
    decorations,
    resizable,
    alwaysOnTop,
    skipTaskbar: false,
  })
}

export const pushToNoticeStack = async (
  input: PushToNoticeStackInput,
): Promise<StackedNotification> => {
  const item: StackedNotification = {
    id: String(input.id),
    uuid: input.uuid ? String(input.uuid) : undefined,
    type: input.type,
    routeType: input.routeType || input.type,
    title: input.title,
    data: input.data,
    receivedAt: input.receivedAt ?? Date.now(),
  }

  useNoticeStackStore.getState().addItem(item)

  const config = getNoticeConfig()
  const label = config.stackWindowLabel || 'notice-stack'
  await emitStackUpdate(label)
  await ensureStackWindow()
  return item
}

export const closeNoticeStackWindow = async (): Promise<void> => {
  if (!isTauriRuntime()) return

  const config = getNoticeConfig()
  const label = config.stackWindowLabel || 'notice-stack'
  const existing = await WebviewWindow.getByLabel(label)
  if (existing) {
    await existing.close()
  }
}
