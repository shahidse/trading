import { getNotifySettings } from '@/lib/notify/settings'
import type { Signal } from '@/lib/types'

/**
 * Telegram alerts via the Bot API (https://core.telegram.org/bots/api).
 *
 * Uses plain `fetch` — no SDK dependency. Credentials are resolved through
 * `getNotifySettings()` (SQLite over env); while the bot token or chat id is
 * missing, the integration stays silent, exactly like Resend.
 */
export function isTelegramConfigured(): boolean {
  const { telegram } = getNotifySettings()
  return Boolean(telegram.enabled && telegram.botToken && telegram.chatId)
}

/** Telegram HTML parse mode only allows a small tag set — escape user text. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const ACTION_ICON: Record<Signal['plan']['action'], string> = {
  BUY: '🟢',
  SELL: '🔴',
  HOLD: '🟡',
  STAY_OUT: '⚪',
}

/** Low-level Bot API call. Throws with Telegram's own description on failure. */
async function apiCall<T>(method: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!isTelegramConfigured()) {
    throw new Error('Telegram is not configured (bot token / chat id missing)')
  }

  const { telegram } = getNotifySettings()
  const response = await fetch(`https://api.telegram.org/bot${telegram.botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; description?: string; result?: T }
    | null

  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram ${method} failed: ${payload?.description ?? response.statusText}`)
  }

  return payload.result as T
}

/** Bot identity, for the `npm run check-telegram` diagnostic. */
export function telegramGetMe(): Promise<{ username?: string; first_name?: string }> {
  return apiCall('getMe')
}

/** Send an arbitrary plain message to the configured chat. */
export async function sendTelegramText(text: string): Promise<void> {
  const { telegram } = getNotifySettings()
  await apiCall('sendMessage', {
    chat_id: telegram.chatId,
    text,
    disable_web_page_preview: true,
  })
}

/** Human-readable alert body for one signal. */
export function renderMessage(signal: Signal): string {
  const { plan } = signal
  const icon = ACTION_ICON[plan.action]
  const sign = signal.score > 0 ? '+' : ''
  const lines: string[] = []

  const actionSuffix =
    plan.action === 'STAY_OUT' || plan.action === 'HOLD'
      ? ` <i>(signal: ${signal.direction})</i>`
      : ''

  lines.push(`${icon} <b>${plan.action}</b>${actionSuffix}`)
  lines.push(
    `<b>${escapeHtml(signal.symbol)}</b> · ${escapeHtml(signal.timeframe)} · score ${sign}${signal.score} (confidence ${signal.confidence})`,
  )
  lines.push('')
  lines.push(`💵 Binance: $${signal.price.toLocaleString()}`)
  if (signal.chainlinkPrice != null) {
    lines.push(
      `🔗 Chainlink: $${signal.chainlinkPrice.toLocaleString()}${
        signal.divergencePct != null ? ` (divergence ${signal.divergencePct}%)` : ''
      }`,
    )
  }

  lines.push('')
  lines.push(`📋 <b>${escapeHtml(plan.headline)}</b>`)

  if (plan.levels) {
    lines.push('')
    lines.push(`Entry  : $${plan.levels.entry.toLocaleString()}`)
    lines.push(`Stop   : $${plan.levels.stopLoss.toLocaleString()} (−${plan.levels.stopDistancePct}%)`)
    lines.push(
      `Target : $${plan.levels.takeProfit.toLocaleString()} (+${plan.levels.targetDistancePct}%)`,
    )
    lines.push(`R:R    : ${plan.levels.riskReward} : 1`)
  } else if (plan.protectiveStop != null) {
    lines.push('')
    lines.push(`Protective stop: $${plan.protectiveStop.toLocaleString()}`)
  }

  lines.push('')
  lines.push(`<b>If flat:</b> ${escapeHtml(plan.forFlat)}`)
  lines.push(`<b>If holding:</b> ${escapeHtml(plan.forHolder)}`)

  if (signal.reasons.length > 0) {
    lines.push('')
    lines.push('<b>Why</b>')
    for (const reason of signal.reasons.slice(0, 4)) lines.push(`• ${escapeHtml(reason)}`)
  }

  lines.push('')
  lines.push(`<i>${escapeHtml(signal.regime.detail)}</i>`)
  lines.push(`<i>${escapeHtml(signal.confluence.detail)}</i>`)
  lines.push(`<i>${new Date(signal.timestamp).toUTCString()}</i>`)
  lines.push('')
  lines.push('<i>Spot note: SHORT means exit / avoid long. Not financial advice.</i>')

  return lines.join('\n')
}

/**
 * Send the alert for a signal. Returns false when Telegram is not configured,
 * so local runs stay silent until credentials are added.
 */
export async function sendSignalTelegram(signal: Signal): Promise<boolean> {
  if (!isTelegramConfigured()) return false

  const { telegram } = getNotifySettings()
  await apiCall('sendMessage', {
    chat_id: telegram.chatId,
    text: renderMessage(signal),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })

  return true
}
