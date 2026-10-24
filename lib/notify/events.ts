import {
  recordAppNotification,
  type StoredAppNotification,
} from '@/lib/db/client'
import { isTelegramConfigured, sendTelegramText } from '@/lib/notify/telegram'

export type EventType = 'trade' | 'hot-coin' | 'risk' | 'signal' | 'system'
export type EventLevel = 'info' | 'success' | 'warning' | 'error'

export type ImportantEventParams = {
  type: EventType
  level: EventLevel
  title: string
  message: string
  symbol?: string
  data?: unknown
}

const TYPE_ICONS: Record<EventType, string> = {
  trade: '💼',
  'hot-coin': '🔥',
  risk: '🛡️',
  signal: '⚡',
  system: '⚙️',
}

const LEVEL_ICONS: Record<EventLevel, string> = {
  info: 'ℹ️',
  success: '🟢',
  warning: '⚠️',
  error: '🚨',
}

/**
 * Unified Event Notification Dispatcher.
 *
 * Dispatches critical trading and application events to:
 * 1. The in-app Notification Center & browser live toasts
 * 2. Telegram Bot (if configured)
 * 3. System console audit log
 */
export async function notifyImportantEvent(
  params: ImportantEventParams,
): Promise<StoredAppNotification> {
  const { type, level, title, message, symbol, data } = params

  // 1. Persist to SQLite / in-memory notifications store
  const id = recordAppNotification({
    type,
    level,
    title,
    message,
    symbol: symbol ?? null,
    data: data ? JSON.stringify(data) : null,
    read: 0,
  })

  const stored: StoredAppNotification = {
    id,
    createdAt: Date.now(),
    type,
    level,
    title,
    message,
    symbol: symbol ?? null,
    data: data ? JSON.stringify(data) : null,
    read: 0,
  }

  // 2. Dispatch to Telegram if bot token and chat ID are configured
  if (isTelegramConfigured()) {
    try {
      const typeIcon = TYPE_ICONS[type] ?? '📢'
      const levelIcon = LEVEL_ICONS[level] ?? ''
      const symLabel = symbol ? ` · <b>${symbol}</b>` : ''

      const telegramLines: string[] = [
        `${levelIcon} ${typeIcon} <b>${title}</b>${symLabel}`,
        '',
        message,
        '',
        `<i>Time: ${new Date().toLocaleTimeString()}</i>`,
      ]

      await sendTelegramText(telegramLines.join('\n')).catch((err) => {
        console.warn('[notify-events] Telegram dispatch warning:', err)
      })
    } catch {
      // Do not allow external messaging errors to interrupt trade flow
    }
  }

  // 3. Log to audit trail
  console.log(`[EVENT] [${level.toUpperCase()}] [${type}] ${title}: ${message}`)

  return stored
}
