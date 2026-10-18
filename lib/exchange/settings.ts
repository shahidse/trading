import { config } from '@/lib/config'
import { getSetting, setSetting } from '@/lib/db/client'

/**
 * Automatic-trading settings.
 *
 * Same resolution order as the notification settings: values saved from the
 * `/settings` page (SQLite) win over the `.env.local` defaults.
 *
 * Safety posture — every switch defaults to the quiet side:
 * trading disabled, kill switch on standby, dry-run **on**, testnet **on**.
 */
export type ExchangeSettings = {
  /** Master arm switch for automatic order placement. */
  enabled: boolean
  /** Immediate halt, checked before every order. */
  killSwitch: boolean
  /** Log the intended order instead of sending it. */
  dryRun: boolean
  /** Binance Spot Testnet (fake funds) instead of mainnet. */
  testnet: boolean
  apiKey: string
  secret: string
  /** Fixed notional per entry, in quote currency. */
  notionalUsd: number
  /** Hard cap — refuse any single order above this. */
  maxNotionalUsd: number
  /** Rolling 24h realised-loss limit; breaching it pauses trading. */
  dailyLossLimitUsd: number
  /** Max trades allowed per 24h window (default 5). */
  maxDailyTrades: number
  /** Automatically attach Binance native OCO bracket (SL + TP) on BUY orders. */
  useOcoBracket: boolean
  /** Reversal scalping mode: capture intraday bullish candle bounces in downtrends. */
  reversalScalpMode: boolean
}

/** What the browser may see: credentials become set/unset flags. */
export type PublicExchangeSettings = {
  enabled: boolean
  killSwitch: boolean
  dryRun: boolean
  testnet: boolean
  notionalUsd: number
  maxNotionalUsd: number
  dailyLossLimitUsd: number
  maxDailyTrades: number
  useOcoBracket: boolean
  reversalScalpMode: boolean
  apiKeySet: boolean
  secretSet: boolean
}

const SETTINGS_KEY = 'exchange'

function envDefaults(): ExchangeSettings {
  return {
    enabled: config.exchange.enabled,
    killSwitch: config.exchange.killSwitch,
    dryRun: config.exchange.dryRun,
    testnet: config.exchange.testnet,
    apiKey: config.exchange.apiKey,
    secret: config.exchange.secret,
    notionalUsd: config.exchange.notionalUsd,
    maxNotionalUsd: config.exchange.maxNotionalUsd,
    dailyLossLimitUsd: config.exchange.dailyLossLimitUsd,
    maxDailyTrades: config.exchange.maxDailyTrades,
    useOcoBracket: config.exchange.useOcoBracket,
    reversalScalpMode: config.exchange.reversalScalpMode,
  }
}

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const str = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback

/** Stored fields win when present; an empty string deliberately clears a secret. */
function mergeStored(raw: unknown, base: ExchangeSettings): ExchangeSettings {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>

  return {
    enabled: bool(r.enabled, base.enabled),
    killSwitch: bool(r.killSwitch, base.killSwitch),
    dryRun: bool(r.dryRun, base.dryRun),
    testnet: bool(r.testnet, base.testnet),
    apiKey: str(r.apiKey, base.apiKey),
    secret: str(r.secret, base.secret),
    notionalUsd: num(r.notionalUsd, base.notionalUsd),
    maxNotionalUsd: num(r.maxNotionalUsd, base.maxNotionalUsd),
    dailyLossLimitUsd: num(r.dailyLossLimitUsd, base.dailyLossLimitUsd),
    maxDailyTrades: num(r.maxDailyTrades, base.maxDailyTrades),
    useOcoBracket: bool(r.useOcoBracket, base.useOcoBracket),
    reversalScalpMode: bool(r.reversalScalpMode, base.reversalScalpMode),
  }
}

/** Effective trading settings (SQLite over env). Never throws. */
export function getExchangeSettings(): ExchangeSettings {
  const base = envDefaults()
  try {
    const stored = getSetting(SETTINGS_KEY)
    if (!stored) return base
    return mergeStored(JSON.parse(stored), base)
  } catch {
    // A corrupt row must never take the app down.
    return base
  }
}

/** Apply a partial patch and persist the merged result. */
export function saveExchangeSettings(patch: Partial<ExchangeSettings>): ExchangeSettings {
  const current = getExchangeSettings()
  const clean: Partial<ExchangeSettings> = {}

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) (clean as Record<string, unknown>)[key] = value
  }

  const next = { ...current, ...clean }
  setSetting(SETTINGS_KEY, JSON.stringify(next))
  return next
}

/** Strip credentials for the API response. */
export function publicExchangeSettings(
  settings: ExchangeSettings = getExchangeSettings(),
): PublicExchangeSettings {
  return {
    enabled: settings.enabled,
    killSwitch: settings.killSwitch,
    dryRun: settings.dryRun,
    testnet: settings.testnet,
    notionalUsd: settings.notionalUsd,
    maxNotionalUsd: settings.maxNotionalUsd,
    dailyLossLimitUsd: settings.dailyLossLimitUsd,
    maxDailyTrades: settings.maxDailyTrades,
    useOcoBracket: settings.useOcoBracket,
    reversalScalpMode: settings.reversalScalpMode,
    apiKeySet: Boolean(settings.apiKey),
    secretSet: Boolean(settings.secret),
  }
}

/**
 * Whether the app may consider placing orders at all.
 *
 * Deliberately does not check credentials — that is a guard inside the trader,
 * so the UI can distinguish "not armed" from "armed but unconfigured".
 */
export function isTradingArmed(settings: ExchangeSettings = getExchangeSettings()): boolean {
  return settings.enabled && !settings.killSwitch
}
