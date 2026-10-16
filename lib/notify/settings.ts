import { config } from '@/lib/config'
import { getSetting, setSetting } from '@/lib/db/client'
import type { NotifyMode } from '@/lib/types'

/**
 * Runtime-editable notification settings.
 *
 * Resolution order: values saved from the `/settings` page (SQLite) win over
 * the `.env.local` defaults, so the app works out of the box with env vars and
 * can be reconfigured live without a restart.
 */
export type EmailNotifySettings = {
  enabled: boolean
  mode: NotifyMode
  apiKey: string
  from: string
  to: string
}

export type TelegramNotifySettings = {
  enabled: boolean
  mode: NotifyMode
  botToken: string
  chatId: string
}

export type NotifySettings = {
  email: EmailNotifySettings
  telegram: TelegramNotifySettings
}

/** What the browser is allowed to see: secrets become set/unset flags. */
export type PublicNotifySettings = {
  email: { enabled: boolean; mode: NotifyMode; from: string; to: string; apiKeySet: boolean }
  telegram: { enabled: boolean; mode: NotifyMode; chatId: string; botTokenSet: boolean }
}

export type NotifySettingsPatch = {
  email?: Partial<EmailNotifySettings>
  telegram?: Partial<TelegramNotifySettings>
}

const SETTINGS_KEY = 'notifications'

export const NOTIFY_MODES: NotifyMode[] = ['action-change', 'direction-change', 'every']

export const DEFAULT_NOTIFY_MODE: NotifyMode = 'action-change'

export const NOTIFY_MODE_LABELS: Record<NotifyMode, string> = {
  'action-change': 'Action change (recommended)',
  'direction-change': 'Direction change',
  every: 'Every analysis',
}

function normalizeMode(value: unknown, fallback: NotifyMode): NotifyMode {
  return NOTIFY_MODES.includes(value as NotifyMode) ? (value as NotifyMode) : fallback
}

/** Env-only defaults: what runs before anything is saved from the UI. */
function envDefaults(): NotifySettings {
  return {
    email: {
      enabled: Boolean(config.email.apiKey && config.email.to),
      mode: normalizeMode(process.env.EMAIL_NOTIFY_MODE, DEFAULT_NOTIFY_MODE),
      apiKey: config.email.apiKey,
      from: config.email.from,
      to: config.email.to,
    },
    telegram: {
      enabled: Boolean(config.telegram.botToken && config.telegram.chatId),
      mode: normalizeMode(process.env.TELEGRAM_NOTIFY_MODE, DEFAULT_NOTIFY_MODE),
      botToken: config.telegram.botToken,
      chatId: config.telegram.chatId,
    },
  }
}

const str = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback
const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

/**
 * Merge a stored blob over the env defaults.
 *
 * Stored fields are authoritative when present — an empty string saved from the
 * UI clears a key rather than silently falling back to the env value.
 */
function mergeStored(raw: unknown, base: NotifySettings): NotifySettings {
  if (!raw || typeof raw !== 'object') return base
  const root = raw as Record<string, unknown>
  const email = (root.email ?? {}) as Record<string, unknown>
  const telegram = (root.telegram ?? {}) as Record<string, unknown>

  return {
    email: {
      enabled: bool(email.enabled, base.email.enabled),
      mode: normalizeMode(email.mode, base.email.mode),
      apiKey: str(email.apiKey, base.email.apiKey),
      from: str(email.from, base.email.from),
      to: str(email.to, base.email.to),
    },
    telegram: {
      enabled: bool(telegram.enabled, base.telegram.enabled),
      mode: normalizeMode(telegram.mode, base.telegram.mode),
      botToken: str(telegram.botToken, base.telegram.botToken),
      chatId: str(telegram.chatId, base.telegram.chatId),
    },
  }
}

/** Effective notification settings (SQLite over env). Never throws. */
export function getNotifySettings(): NotifySettings {
  const base = envDefaults()
  try {
    const stored = getSetting(SETTINGS_KEY)
    if (!stored) return base
    return mergeStored(JSON.parse(stored), base)
  } catch {
    // A corrupt row or unavailable DB must not break an analysis run.
    return base
  }
}

/** Apply a partial patch and persist the merged result. */
export function saveNotifySettings(patch: NotifySettingsPatch): NotifySettings {
  const current = getNotifySettings()

  const next: NotifySettings = {
    email: { ...current.email, ...stripUndefined(patch.email) },
    telegram: { ...current.telegram, ...stripUndefined(patch.telegram) },
  }
  next.email.mode = normalizeMode(next.email.mode, DEFAULT_NOTIFY_MODE)
  next.telegram.mode = normalizeMode(next.telegram.mode, DEFAULT_NOTIFY_MODE)

  setSetting(SETTINGS_KEY, JSON.stringify(next))
  return next
}

function stripUndefined<T extends object>(patch: T | undefined): Partial<T> {
  if (!patch) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) out[key] = value
  }
  return out as Partial<T>
}

/** Strip secrets for the API response. */
export function publicNotifySettings(
  settings: NotifySettings = getNotifySettings(),
): PublicNotifySettings {
  return {
    email: {
      enabled: settings.email.enabled,
      mode: settings.email.mode,
      from: settings.email.from,
      to: settings.email.to,
      apiKeySet: Boolean(settings.email.apiKey),
    },
    telegram: {
      enabled: settings.telegram.enabled,
      mode: settings.telegram.mode,
      chatId: settings.telegram.chatId,
      botTokenSet: Boolean(settings.telegram.botToken),
    },
  }
}
