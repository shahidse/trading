import { getSetting, setSetting } from '@/lib/db/client'
import { getExchangeSettings } from '@/lib/exchange/settings'
import { config } from '@/lib/config'

export type HotCoinTradingSettings = {
  /** Master switch for auto-buying top hot coins */
  enabled: boolean
  /** Number of top hot coins to buy (e.g. 1, 2, 3, 5). Default 3 */
  topCoinsCount: number
  /** Minimum breakout/heat score required (0 - 100). Default 70 */
  minHeatScore: number
  /** USD order size limit per coin entry. Default $50 */
  orderNotionalUsd: number
  /** Hard cap on single order notional in USD. Default $100 */
  maxNotionalUsd: number
  /** Rolling 24h loss ceiling in USD for hot coin trades. Default $50 */
  dailyLossLimitUsd: number
  /** Max hot coin trades allowed per 24h window. Default 6 */
  maxDailyTrades: number
  /** Minimum minutes before the same coin can be bought again. Default 60 */
  cooldownMinutes: number
  /** Automatically attach Binance native OCO bracket (SL + TP) on BUY orders */
  useOcoBracket: boolean
  /** Fallback Stop-Loss percentage if not derived by scanner. Default 3.0% */
  stopLossPct: number
  /** Fallback Take-Profit percentage if not derived by scanner. Default 6.0% */
  takeProfitPct: number
  /** Dry-run simulation mode (does not send real money). Default true */
  dryRun: boolean
}

export type PublicHotCoinTradingSettings = HotCoinTradingSettings & {
  exchangeConfigured: boolean
  exchangeTestnet: boolean
  masterKillSwitch: boolean
}

const SETTINGS_KEY = 'hot_coins_trading'

export const DEFAULT_HOT_COIN_SETTINGS: HotCoinTradingSettings = {
  enabled: false,
  topCoinsCount: 3,
  minHeatScore: 70,
  orderNotionalUsd: 50,
  maxNotionalUsd: 100,
  dailyLossLimitUsd: 50,
  maxDailyTrades: 6,
  cooldownMinutes: 60,
  useOcoBracket: true,
  stopLossPct: 3.0,
  takeProfitPct: 6.0,
  dryRun: true,
}

export function envDefaults(): HotCoinTradingSettings {
  return {
    enabled: config.hotCoins.enabled,
    topCoinsCount: config.hotCoins.topCoinsCount,
    minHeatScore: config.hotCoins.minHeatScore,
    orderNotionalUsd: config.hotCoins.orderNotionalUsd,
    maxNotionalUsd: config.hotCoins.maxNotionalUsd,
    dailyLossLimitUsd: config.hotCoins.dailyLossLimitUsd,
    maxDailyTrades: config.hotCoins.maxDailyTrades,
    cooldownMinutes: config.hotCoins.cooldownMinutes,
    useOcoBracket: config.hotCoins.useOcoBracket,
    stopLossPct: config.hotCoins.stopLossPct,
    takeProfitPct: config.hotCoins.takeProfitPct,
    dryRun: config.hotCoins.dryRun,
  }
}

const bool = (v: unknown, fb: boolean): boolean => (typeof v === 'boolean' ? v : fb)
const num = (v: unknown, fb: number): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fb

export function mergeHotCoinSettings(
  raw: unknown,
  base: HotCoinTradingSettings = envDefaults(),
): HotCoinTradingSettings {
  if (!raw || typeof raw !== 'object') return { ...base }
  const r = raw as Record<string, unknown>

  return {
    enabled: bool(r.enabled, base.enabled),
    topCoinsCount: Math.min(10, Math.max(1, Math.round(num(r.topCoinsCount, base.topCoinsCount)))),
    minHeatScore: Math.min(99, Math.max(10, num(r.minHeatScore, base.minHeatScore))),
    orderNotionalUsd: num(r.orderNotionalUsd, base.orderNotionalUsd),
    maxNotionalUsd: num(r.maxNotionalUsd, base.maxNotionalUsd),
    dailyLossLimitUsd: num(r.dailyLossLimitUsd, base.dailyLossLimitUsd),
    maxDailyTrades: Math.max(1, Math.round(num(r.maxDailyTrades, base.maxDailyTrades))),
    cooldownMinutes: Math.max(5, Math.round(num(r.cooldownMinutes, base.cooldownMinutes))),
    useOcoBracket: bool(r.useOcoBracket, base.useOcoBracket),
    stopLossPct: Math.min(20, Math.max(0.5, num(r.stopLossPct, base.stopLossPct))),
    takeProfitPct: Math.min(50, Math.max(1, num(r.takeProfitPct, base.takeProfitPct))),
    dryRun: bool(r.dryRun, base.dryRun),
  }
}

/** Get effective hot coin settings (SQLite > env defaults). Never throws. */
export function getHotCoinSettings(): HotCoinTradingSettings {
  const base = envDefaults()
  try {
    const raw = getSetting(SETTINGS_KEY)
    if (!raw) return base
    return mergeHotCoinSettings(JSON.parse(raw), base)
  } catch {
    return base
  }
}

/** Persist a partial patch of hot coin trading settings. */
export function saveHotCoinSettings(
  patch: Partial<HotCoinTradingSettings>,
): HotCoinTradingSettings {
  const current = getHotCoinSettings()
  const clean: Partial<HotCoinTradingSettings> = {}

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) (clean as Record<string, unknown>)[key] = value
  }

  const next = mergeHotCoinSettings(clean, current)
  setSetting(SETTINGS_KEY, JSON.stringify(next))
  return next
}

/** Public representation for UI and API consumption. */
export function publicHotCoinSettings(
  settings: HotCoinTradingSettings = getHotCoinSettings(),
): PublicHotCoinTradingSettings {
  const ex = getExchangeSettings()
  return {
    ...settings,
    exchangeConfigured: Boolean(ex.apiKey && ex.secret),
    exchangeTestnet: ex.testnet,
    masterKillSwitch: ex.killSwitch,
  }
}
