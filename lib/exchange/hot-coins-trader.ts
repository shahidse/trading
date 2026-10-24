import {
  getOpenBuyPosition,
  getOpenDryRunPosition,
  getRecentTradeOrders,
  type StoredTradeOrder,
} from '@/lib/db/client'
import {
  executeTrade,
  inMemoryDryRunPositions,
  type TradeIntent,
  type TradeOutcome,
} from '@/lib/exchange/trader'
import { getExchangeSettings } from '@/lib/exchange/settings'
import {
  getHotCoinSettings,
  type HotCoinTradingSettings,
} from '@/lib/exchange/hot-coins-settings'
import { scanHotCoins, type ScannedHotCoin } from '@/lib/data/scanner'
import { notifyImportantEvent } from '@/lib/notify/events'
import type { TradeLevels } from '@/lib/types'

export type HotCoinCandidate = {
  coin: ScannedHotCoin
  eligible: boolean
  skipReason?: string
  levels: TradeLevels
}

export type HotCoinEvaluation = {
  timestamp: number
  settings: HotCoinTradingSettings
  evaluatedTotal: number
  topCandidates: HotCoinCandidate[]
  eligibleToBuy: HotCoinCandidate[]
}

export type HotCoinExecutionReport = {
  timestamp: number
  success: boolean
  evaluatedCount: number
  executedCount: number
  skippedCount: number
  orders: Array<{
    symbol: string
    rank: number
    heatScore: number
    outcome: TradeOutcome
  }>
  message: string
}

/**
 * Pure evaluation function that scores and filters hot coins against
 * user configuration, quality thresholds, position guards, and cooldowns.
 */
export function evaluateHotCoinCandidates(
  coins: ScannedHotCoin[],
  settings: HotCoinTradingSettings,
  hasOpenPosition: (symbol: string) => boolean,
  lastTradeTimestamp: (symbol: string) => number | null,
  now: number = Date.now(),
): HotCoinEvaluation {
  // Sort by heatScore descending, then by rangePositionPct
  const sorted = [...coins].sort(
    (a, b) => b.heatScore - a.heatScore || b.rangePositionPct - a.rangePositionPct,
  )

  const topPool = sorted.slice(0, Math.max(settings.topCoinsCount * 2, 8))
  const candidates: HotCoinCandidate[] = []

  const cooldownMs = settings.cooldownMinutes * 60 * 1000

  for (const coin of topPool) {
    const entry = coin.entryPrice > 0 ? coin.entryPrice : coin.price
    const stopLoss =
      coin.stopLossPrice && coin.stopLossPrice > 0 && coin.stopLossPrice < entry
        ? coin.stopLossPrice
        : entry * (1 - settings.stopLossPct / 100)
    const takeProfit =
      coin.targetPrice && coin.targetPrice > entry
        ? coin.targetPrice
        : entry * (1 + settings.takeProfitPct / 100)

    const stopDistancePct = entry > 0 ? ((entry - stopLoss) / entry) * 100 : settings.stopLossPct
    const targetDistancePct = entry > 0 ? ((takeProfit - entry) / entry) * 100 : settings.takeProfitPct
    const riskReward = stopDistancePct > 0 ? targetDistancePct / stopDistancePct : 2

    const levels: TradeLevels = {
      entry,
      stopLoss,
      takeProfit,
      riskReward: Number(riskReward.toFixed(2)),
      stopDistancePct: Number(stopDistancePct.toFixed(2)),
      targetDistancePct: Number(targetDistancePct.toFixed(2)),
    }

    let eligible = true
    let skipReason: string | undefined

    if (coin.heatScore < settings.minHeatScore) {
      eligible = false
      skipReason = `Heat score (${coin.heatScore}%) below threshold (${settings.minHeatScore}%)`
    } else if (hasOpenPosition(coin.symbol)) {
      eligible = false
      skipReason = `Already holding an open position in ${coin.symbol}`
    } else {
      const lastBuy = lastTradeTimestamp(coin.symbol)
      if (lastBuy && now - lastBuy < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - (now - lastBuy)) / 60000)
        eligible = false
        skipReason = `Cooldown active: bought ${Math.round((now - lastBuy) / 60000)}m ago (${remainingMinutes}m remaining)`
      }
    }

    candidates.push({
      coin,
      eligible,
      skipReason,
      levels,
    })
  }

  const eligibleToBuy = candidates
    .filter((c) => c.eligible)
    .slice(0, settings.topCoinsCount)

  return {
    timestamp: now,
    settings,
    evaluatedTotal: coins.length,
    topCandidates: candidates,
    eligibleToBuy,
  }
}

/** Check if there is an active position for a symbol (live or dry-run). */
export function hasActivePositionForCoin(symbol: string, isDryRun: boolean): boolean {
  if (isDryRun) {
    const mem = inMemoryDryRunPositions.get(symbol)
    if (mem && mem.side === 'BUY') return true
    try {
      const dry = getOpenDryRunPosition(symbol)
      return dry !== null && dry.side === 'BUY'
    } catch {
      return false
    }
  }

  try {
    const buy = getOpenBuyPosition(symbol)
    return buy !== null
  } catch {
    return false
  }
}

/** Find timestamp of the most recent BUY order placed for a symbol. */
export function getLastBuyTimestampForCoin(symbol: string): number | null {
  try {
    const recent = getRecentTradeOrders(50)
    const match = recent.find((o) => o.symbol === symbol && o.side === 'BUY')
    return match ? match.createdAt : null
  } catch {
    return null
  }
}

/** Get all currently open hot coin positions. */
export function getActiveHotCoinPositions(isDryRun: boolean): Array<{
  symbol: string
  quantity: number
  price: number | null
  notionalUsd: number
  createdAt: number
  environment: string
}> {
  const result: Array<{
    symbol: string
    quantity: number
    price: number | null
    notionalUsd: number
    createdAt: number
    environment: string
  }> = []

  if (isDryRun) {
    for (const [sym, pos] of inMemoryDryRunPositions.entries()) {
      if (pos.side === 'BUY') {
        result.push({
          symbol: sym,
          quantity: pos.quantity,
          price: pos.price,
          notionalUsd: pos.notionalUsd,
          createdAt: pos.timestamp,
          environment: 'dry-run',
        })
      }
    }
    return result
  }

  try {
    const recent = getRecentTradeOrders(100)
    const symbolsSeen = new Set<string>()

    for (const order of recent) {
      if (!symbolsSeen.has(order.symbol)) {
        symbolsSeen.add(order.symbol)
        const openPos = getOpenBuyPosition(order.symbol)
        if (openPos) {
          result.push({
            symbol: openPos.symbol,
            quantity: openPos.quantity,
            price: openPos.price,
            notionalUsd: openPos.notionalUsd,
            createdAt: openPos.createdAt,
            environment: openPos.environment,
          })
        }
      }
    }
  } catch {}

  return result
}

export type ExecuteHotCoinsOptions = {
  force?: boolean
  topCount?: number
  symbols?: string[]
}

/**
 * Executes BUY orders for the Top N Hot Coins based on breakout & heat scoring.
 * Can be run automatically by the scheduler or triggered on-demand via UI/API.
 */
export async function executeHotCoinBuys(
  options: ExecuteHotCoinsOptions = {},
): Promise<HotCoinExecutionReport> {
  const exSettings = getExchangeSettings()
  const hotSettings = getHotCoinSettings()

  // Master safety kill switch check
  if (exSettings.killSwitch) {
    return {
      timestamp: Date.now(),
      success: false,
      evaluatedCount: 0,
      executedCount: 0,
      skippedCount: 0,
      orders: [],
      message: 'Master kill switch is engaged. All trading halted.',
    }
  }

  if (!hotSettings.enabled && !options.force) {
    return {
      timestamp: Date.now(),
      success: false,
      evaluatedCount: 0,
      executedCount: 0,
      skippedCount: 0,
      orders: [],
      message: 'Hot Coin auto-buying is currently disabled in settings.',
    }
  }

  const effectiveSettings: HotCoinTradingSettings = {
    ...hotSettings,
    topCoinsCount: options.topCount ?? hotSettings.topCoinsCount,
  }

  // Scan market order books and heat metrics
  const scannerResult = await scanHotCoins()
  const pool = scannerResult.hotCoins.length > 0 ? scannerResult.hotCoins : scannerResult.allCoins

  const isDryRun = effectiveSettings.dryRun || exSettings.dryRun

  const evaluation = evaluateHotCoinCandidates(
    pool,
    effectiveSettings,
    (sym) => hasActivePositionForCoin(sym, isDryRun),
    (sym) => getLastBuyTimestampForCoin(sym),
  )

  const toExecute = options.symbols && options.symbols.length > 0
    ? evaluation.topCandidates.filter((c) => options.symbols!.includes(c.coin.symbol))
    : evaluation.eligibleToBuy

  if (toExecute.length === 0) {
    const reasons = evaluation.topCandidates
      .filter((c) => !c.eligible)
      .slice(0, 3)
      .map((c) => `${c.coin.base}: ${c.skipReason}`)
      .join('; ')

    return {
      timestamp: Date.now(),
      success: true,
      evaluatedCount: pool.length,
      executedCount: 0,
      skippedCount: evaluation.topCandidates.length,
      orders: [],
      message: `No eligible hot coins to buy right now. ${reasons ? `(${reasons})` : ''}`,
    }
  }

  const orders: HotCoinExecutionReport['orders'] = []

  for (const candidate of toExecute) {
    const { coin, levels } = candidate
    const intent: TradeIntent = {
      side: 'BUY',
      symbol: coin.symbol,
      notionalUsd: effectiveSettings.orderNotionalUsd,
      reason: `Hot Coin Screener #${coin.rank} (${coin.heatScore}% heat) - ${coin.signalHeadline || 'Pump Setup'}`,
    }

    try {
      const outcome = await executeTrade(intent, null, levels, {
        enabled: true,
        dryRun: isDryRun,
        notionalUsd: effectiveSettings.orderNotionalUsd,
        maxNotionalUsd: effectiveSettings.maxNotionalUsd,
        dailyLossLimitUsd: effectiveSettings.dailyLossLimitUsd,
        maxDailyTrades: effectiveSettings.maxDailyTrades,
        useOcoBracket: effectiveSettings.useOcoBracket,
      })

      orders.push({
        symbol: coin.symbol,
        rank: coin.rank,
        heatScore: coin.heatScore,
        outcome,
      })
    } catch (err) {
      orders.push({
        symbol: coin.symbol,
        rank: coin.rank,
        heatScore: coin.heatScore,
        outcome: {
          status: 'error',
          side: 'BUY',
          symbol: coin.symbol,
          quantity: null,
          price: null,
          notionalUsd: effectiveSettings.orderNotionalUsd,
          reason: err instanceof Error ? err.message : String(err),
          environment: isDryRun ? 'dry-run' : exSettings.testnet ? 'testnet' : 'live',
          realisedPnlUsd: null,
        },
      })
    }
  }

  const placedCount = orders.filter((o) => o.outcome.status === 'placed' || o.outcome.status === 'dry-run').length

  if (placedCount > 0) {
    void notifyImportantEvent({
      type: 'hot-coin',
      level: 'success',
      title: 'Top Hot Coins Auto-Bought',
      message: `${isDryRun ? 'Simulated' : 'Executed'} ${placedCount} hot coin BUY orders (${orders.map((o) => `${o.symbol} #${o.rank}`).join(', ')})`,
      data: { orders },
    }).catch(() => {})
  }

  return {
    timestamp: Date.now(),
    success: placedCount > 0,
    evaluatedCount: pool.length,
    executedCount: placedCount,
    skippedCount: evaluation.topCandidates.length - placedCount,
    orders,
    message: `${isDryRun ? 'Simulated (Dry-Run)' : 'Executed'} ${placedCount} hot coin BUY orders (${orders.map((o) => o.symbol).join(', ')})`,
  }
}

/**
 * 1-Click Buy for a specific Hot Coin directly from the Radar interface.
 */
export async function executeSingleHotCoinBuy(
  symbol: string,
  customNotionalUsd?: number,
): Promise<{ success: boolean; outcome: TradeOutcome; message: string }> {
  const exSettings = getExchangeSettings()
  const hotSettings = getHotCoinSettings()

  if (exSettings.killSwitch) {
    throw new Error('Trading is halted — master kill switch is engaged.')
  }

  const isDryRun = hotSettings.dryRun || exSettings.dryRun
  const notionalUsd = customNotionalUsd ?? hotSettings.orderNotionalUsd

  const scannerResult = await scanHotCoins().catch(() => null)
  const coin = scannerResult?.allCoins.find((c) => c.symbol === symbol) ??
               scannerResult?.hotCoins.find((c) => c.symbol === symbol)

  const entry = coin ? coin.entryPrice || coin.price : 0
  const stopLoss = coin && coin.stopLossPrice ? coin.stopLossPrice : entry * (1 - hotSettings.stopLossPct / 100)
  const takeProfit = coin && coin.targetPrice ? coin.targetPrice : entry * (1 + hotSettings.takeProfitPct / 100)

  const stopDistancePct = entry > 0 ? ((entry - stopLoss) / entry) * 100 : hotSettings.stopLossPct
  const targetDistancePct = entry > 0 ? ((takeProfit - entry) / entry) * 100 : hotSettings.takeProfitPct
  const riskReward = stopDistancePct > 0 ? targetDistancePct / stopDistancePct : 2

  const levels: TradeLevels = {
    entry,
    stopLoss,
    takeProfit,
    riskReward: Number(riskReward.toFixed(2)),
    stopDistancePct: Number(stopDistancePct.toFixed(2)),
    targetDistancePct: Number(targetDistancePct.toFixed(2)),
  }

  const intent: TradeIntent = {
    side: 'BUY',
    symbol,
    notionalUsd,
    reason: `Manual 1-Click Hot Coin buy: ${symbol} (${coin?.heatScore ?? 0}% heat)`,
  }

  const outcome = await executeTrade(intent, null, levels, {
    enabled: true,
    dryRun: isDryRun,
    notionalUsd,
    maxNotionalUsd: Math.max(hotSettings.maxNotionalUsd, notionalUsd),
    dailyLossLimitUsd: hotSettings.dailyLossLimitUsd,
    maxDailyTrades: hotSettings.maxDailyTrades,
    useOcoBracket: hotSettings.useOcoBracket,
  })

  return {
    success: outcome.status === 'placed' || outcome.status === 'dry-run',
    outcome,
    message: outcome.reason,
  }
}
