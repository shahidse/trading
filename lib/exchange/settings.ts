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
  credentialSource?: 'env' | 'fast-connect' | 'none'
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
  credentialSource: 'env' | 'fast-connect' | 'none'
  hasEnvCredentials: boolean
  keyMasked?: string
}

const SETTINGS_KEY = 'exchange'

function envDefaults(): ExchangeSettings {
  const hasEnv = Boolean(config.exchange.apiKey && config.exchange.apiKey.trim() !== '')
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
    credentialSource: hasEnv ? 'env' : 'none',
  }
}

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const str = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() !== '' ? value : fallback

/**
 * ENV key is ALWAYS the primary default.
 * If base.apiKey (from process.env) is set, it unconditionally wins.
 * If base.apiKey is empty, stored Fast Connect credentials are used as the 2nd option.
 */
export function mergeStored(raw: unknown, base: ExchangeSettings): ExchangeSettings {
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>

  const hasEnvKey = Boolean(base.apiKey && base.apiKey.trim() !== '')
  const apiKey = hasEnvKey ? base.apiKey : str(r.apiKey, '')
  const secret = hasEnvKey ? base.secret : str(r.secret, '')
  const credentialSource = hasEnvKey ? 'env' : (apiKey ? 'fast-connect' : 'none')

  return {
    enabled: bool(r.enabled, base.enabled),
    killSwitch: bool(r.killSwitch, base.killSwitch),
    dryRun: bool(r.dryRun, base.dryRun),
    testnet: bool(r.testnet, base.testnet),
    apiKey,
    secret,
    notionalUsd: num(r.notionalUsd, base.notionalUsd),
    maxNotionalUsd: num(r.maxNotionalUsd, base.maxNotionalUsd),
    dailyLossLimitUsd: num(r.dailyLossLimitUsd, base.dailyLossLimitUsd),
    maxDailyTrades: num(r.maxDailyTrades, base.maxDailyTrades),
    useOcoBracket: bool(r.useOcoBracket, base.useOcoBracket),
    reversalScalpMode: bool(r.reversalScalpMode, base.reversalScalpMode),
    credentialSource,
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
  const hasEnv = Boolean(config.exchange.apiKey && config.exchange.apiKey.trim() !== '')
  const source = hasEnv ? 'env' : (settings.apiKey ? 'fast-connect' : 'none')

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
    credentialSource: source,
    hasEnvCredentials: hasEnv,
    keyMasked: settings.apiKey ? `${settings.apiKey.slice(0, 4)}...${settings.apiKey.slice(-4)}` : undefined,
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
