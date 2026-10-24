import { config } from '@/lib/config'
import {
  getOpenBuyPosition,
  getOpenDryRunPosition,
  getRecentTradeOrders,
  realisedPnlSince,
  countTradesSince,
  type StoredTradeOrder,
} from '@/lib/db/client'
import { getExchangeSettings, type ExchangeSettings } from '@/lib/exchange/settings'
import { getHotCoinSettings, type HotCoinTradingSettings } from '@/lib/exchange/hot-coins-settings'
import { inMemoryDryRunPositions } from '@/lib/exchange/trader'
import { getActiveHotCoinPositions } from '@/lib/exchange/hot-coins-trader'

const DAY_MS = 24 * 60 * 60 * 1000

export type GuardStatus = 'ok' | 'warning' | 'blocked'

export type GuardCheckItem = {
  id: string
  name: string
  passed: boolean
  status: GuardStatus
  currentValue: string
  thresholdOrLimit: string
  message: string
  helpText?: string
}

export type StrategyReadiness = {
  strategyName: string
  status: 'READY' | 'PARTIALLY_BLOCKED' | 'BLOCKED'
  enabled: boolean
  dryRun: boolean
  testnet: boolean
  environment: string
  blockers: string[]
  warnings: string[]
  guards: GuardCheckItem[]
}

export type TradingActivityCoinStats = {
  symbol: string
  category: 'primary' | 'hot-coin'
  totalOrders: number
  buysCount: number
  sellsCount: number
  volumeUsd: number
  realisedPnlUsd: number
  winRatePct: number
  winningTrades: number
  losingTrades: number
  hasOpenPosition: boolean
  lastTradedAt: number | null
}

export type TradingActivityBreakdown = {
  summary: {
    totalVolumeUsd: number
    totalRealisedPnlUsd: number
    totalOrders: number
    executedBuys: number
    executedSells: number
    overallWinRatePct: number
    activePositionsCount: number
  }
  primary: {
    symbol: string
    totalOrders: number
    executedBuys: number
    executedSells: number
    volumeUsd: number
    realisedPnlUsd: number
    winRatePct: number
    openPosition: {
      symbol: string
      side: string
      quantity: number
      price: number | null
      notionalUsd: number
      createdAt: number
    } | null
  }
  hotCoins: {
    totalOrders: number
    executedBuys: number
    executedSells: number
    volumeUsd: number
    realisedPnlUsd: number
    winRatePct: number
    activePositionsCount: number
    coins: TradingActivityCoinStats[]
  }
}

export type RecentGuardRefusal = {
  id: number
  createdAt: number
  symbol: string
  side: string
  notionalUsd: number
  reason: string
}

export type LimitMeter = {
  current: number
  limit: number
  remaining: number
  percentUsed: number
  status: 'safe' | 'warning' | 'breached'
  unit: 'USD' | 'trades'
}

export type FullConfigReport = {
  timestamp: number
  verdict: {
    overallStatus: 'READY' | 'PARTIALLY_BLOCKED' | 'BLOCKED'
    headline: string
    activeBlockers: string[]
    activeWarnings: string[]
  }
  primaryReadiness: StrategyReadiness
  hotCoinsReadiness: StrategyReadiness
  limits: {
    primaryDailyLoss: LimitMeter
    primaryDailyTrades: LimitMeter
    hotCoinsDailyLoss: LimitMeter
    hotCoinsDailyTrades: LimitMeter
    maxNotionalUsd: number
    hotCoinsMaxNotionalUsd: number
  }
  tradingBreakdown: TradingActivityBreakdown
  recentRefusals: RecentGuardRefusal[]
}

/**
 * Pure evaluation of primary strategy guards against current settings and 24h rolling metrics.
 */
export function evaluatePrimaryGuards(params: {
  settings: ExchangeSettings
  primarySymbol: string
  realisedPnl24h: number
  tradesCount24h: number
}): { guards: GuardCheckItem[]; blockers: string[]; warnings: string[] } {
  const { settings, realisedPnl24h, tradesCount24h } = params
  const guards: GuardCheckItem[] = []
  const blockers: string[] = []
  const warnings: string[] = []

  // 1. Master Kill Switch
  const killSwitchPassed = !settings.killSwitch
  if (!killSwitchPassed) {
    blockers.push('Master Kill Switch is ACTIVE: All automated order execution is completely frozen.')
  }
  guards.push({
    id: 'kill_switch',
    name: 'Master Kill Switch',
    passed: killSwitchPassed,
    status: killSwitchPassed ? 'ok' : 'blocked',
    currentValue: settings.killSwitch ? 'HALTED' : 'STANDBY',
    thresholdOrLimit: 'Must be OFF (Standby)',
    message: killSwitchPassed ? 'Kill switch is standby' : 'Emergency halt is actively blocking all trades',
    helpText: 'Toggle kill switch off in settings or header controls to resume.',
  })

  // 2. Automatic Trading Armed
  const enabledPassed = settings.enabled
  if (!enabledPassed) {
    blockers.push('Primary Strategy Auto-Trading is DISABLED: Orders will not execute until armed.')
  }
  guards.push({
    id: 'primary_enabled',
    name: 'Auto-Trading Switch',
    passed: enabledPassed,
    status: enabledPassed ? 'ok' : 'blocked',
    currentValue: settings.enabled ? 'ARMED' : 'DISABLED',
    thresholdOrLimit: 'Must be ARMED',
    message: enabledPassed ? 'Primary trading is armed' : 'Automatic execution is disabled in settings',
    helpText: 'Enable auto-trading on the dashboard or in /settings to allow automated orders.',
  })

  // 3. API Key & Secret Credentials
  const needsKeys = !settings.dryRun
  const keysConfigured = Boolean(settings.apiKey && settings.secret)
  const keysPassed = !needsKeys || keysConfigured
  if (needsKeys && !keysConfigured) {
    blockers.push('Binance API Key / Secret is NOT configured: Live/testnet execution requires valid credentials.')
  }
  guards.push({
    id: 'credentials',
    name: 'Exchange API Credentials',
    passed: keysPassed,
    status: keysPassed ? 'ok' : 'blocked',
    currentValue: keysConfigured ? 'Configured' : (settings.dryRun ? 'Dry-Run Mode (Keys optional)' : 'Missing'),
    thresholdOrLimit: 'Required for Live / Testnet',
    message: keysPassed
      ? (settings.dryRun ? 'Simulated execution (Dry-run active)' : 'Credentials configured')
      : 'API key or secret is missing',
  })

  // 4. Order Notional Size Cap
  const notionalPassed = settings.notionalUsd > 0 && settings.notionalUsd <= settings.maxNotionalUsd
  if (settings.notionalUsd > settings.maxNotionalUsd) {
    blockers.push(
      `Order Size Exceeds Hard Cap: Configured entry $${settings.notionalUsd.toFixed(2)} exceeds $${settings.maxNotionalUsd.toFixed(2)} maximum ceiling.`,
    )
  }
  guards.push({
    id: 'notional_cap',
    name: 'Per-Order Notional Cap',
    passed: notionalPassed,
    status: notionalPassed ? 'ok' : 'blocked',
    currentValue: `$${settings.notionalUsd.toFixed(2)}`,
    thresholdOrLimit: `Max $${settings.maxNotionalUsd.toFixed(2)}`,
    message: notionalPassed
      ? `Order size $${settings.notionalUsd.toFixed(2)} is within safe bounds`
      : `Order size exceeds $${settings.maxNotionalUsd.toFixed(2)} hard cap`,
  })

  // 5. Rolling 24h Daily Loss Limit
  const dailyLossLimit = settings.dailyLossLimitUsd
  const lossBreached = dailyLossLimit > 0 && realisedPnl24h <= -dailyLossLimit
  const lossWarning = dailyLossLimit > 0 && realisedPnl24h <= -dailyLossLimit * 0.75 && !lossBreached

  if (lossBreached) {
    blockers.push(
      `Daily Loss Limit REACHED: 24h realised loss (-$${Math.abs(realisedPnl24h).toFixed(2)}) reached the -$${dailyLossLimit.toFixed(2)} ceiling. Orders halted.`,
    )
  } else if (lossWarning) {
    warnings.push(
      `Daily Loss Limit Alert: 24h loss (-$${Math.abs(realisedPnl24h).toFixed(2)}) has reached 75%+ of the -$${dailyLossLimit.toFixed(2)} ceiling.`,
    )
  }

  guards.push({
    id: 'daily_loss',
    name: '24h Daily Loss Limit',
    passed: !lossBreached,
    status: lossBreached ? 'blocked' : lossWarning ? 'warning' : 'ok',
    currentValue: realisedPnl24h < 0 ? `-$${Math.abs(realisedPnl24h).toFixed(2)}` : `+$${realisedPnl24h.toFixed(2)}`,
    thresholdOrLimit: dailyLossLimit > 0 ? `Max Loss -$${dailyLossLimit.toFixed(2)}` : 'Unlimited',
    message: lossBreached
      ? `Daily loss limit reached ($${realisedPnl24h.toFixed(2)} vs -$${dailyLossLimit.toFixed(2)})`
      : lossWarning
      ? 'Approaching daily loss limit'
      : 'Within safe daily loss boundary',
  })

  // 6. Rolling 24h Daily Trades Count
  const maxTrades = settings.maxDailyTrades
  const tradesBreached = maxTrades > 0 && tradesCount24h >= maxTrades
  const tradesWarning = maxTrades > 0 && tradesCount24h >= Math.floor(maxTrades * 0.8) && !tradesBreached

  if (tradesBreached) {
    blockers.push(
      `Daily Trade Limit REACHED: ${tradesCount24h} of ${maxTrades} maximum allowed trades executed in the last 24h. No new orders allowed until window resets.`,
    )
  } else if (tradesWarning) {
    warnings.push(
      `Daily Trade Count Alert: ${tradesCount24h} of ${maxTrades} allowed trades executed (${maxTrades - tradesCount24h} remaining).`,
    )
  }

  guards.push({
    id: 'daily_trades',
    name: '24h Daily Trade Count',
    passed: !tradesBreached,
    status: tradesBreached ? 'blocked' : tradesWarning ? 'warning' : 'ok',
    currentValue: `${tradesCount24h} trades`,
    thresholdOrLimit: maxTrades > 0 ? `Max ${maxTrades} trades/day` : 'Unlimited',
    message: tradesBreached
      ? `Trade ceiling reached (${tradesCount24h}/${maxTrades})`
      : `${tradesCount24h}/${maxTrades} trades used today`,
  })

  return { guards, blockers, warnings }
}

/**
 * Pure evaluation of Hot-Coins strategy guards.
 */
export function evaluateHotCoinsGuards(params: {
  hotSettings: HotCoinTradingSettings
  exSettings: ExchangeSettings
  realisedPnl24h: number
  tradesCount24h: number
}): { guards: GuardCheckItem[]; blockers: string[]; warnings: string[] } {
  const { hotSettings, exSettings, realisedPnl24h, tradesCount24h } = params
  const guards: GuardCheckItem[] = []
  const blockers: string[] = []
  const warnings: string[] = []

  // 1. Master Kill Switch
  const killSwitchPassed = !exSettings.killSwitch
  if (!killSwitchPassed) {
    blockers.push('Master Kill Switch is ACTIVE: Hot coin purchases are halted.')
  }
  guards.push({
    id: 'hot_kill_switch',
    name: 'Master Kill Switch',
    passed: killSwitchPassed,
    status: killSwitchPassed ? 'ok' : 'blocked',
    currentValue: exSettings.killSwitch ? 'HALTED' : 'STANDBY',
    thresholdOrLimit: 'Must be OFF',
    message: killSwitchPassed ? 'Kill switch is standby' : 'Halted by master kill switch',
  })

  // 2. Hot Coins Trading Enabled Switch
  const enabledPassed = hotSettings.enabled
  if (!enabledPassed) {
    blockers.push('Hot Coins Auto-Trading is DISABLED in configuration: Scheduled auto-buys will not run.')
  }
  guards.push({
    id: 'hot_enabled',
    name: 'Hot Coins Auto-Trade Switch',
    passed: enabledPassed,
    status: enabledPassed ? 'ok' : 'blocked',
    currentValue: hotSettings.enabled ? 'ENABLED' : 'DISABLED',
    thresholdOrLimit: 'Must be ENABLED',
    message: enabledPassed ? `Top ${hotSettings.topCoinsCount} coins auto-buy enabled` : 'Auto-buy is disabled',
  })

  // 3. Per-Coin Order Size Cap
  const notionalPassed = hotSettings.orderNotionalUsd > 0 && hotSettings.orderNotionalUsd <= hotSettings.maxNotionalUsd
  if (hotSettings.orderNotionalUsd > hotSettings.maxNotionalUsd) {
    blockers.push(
      `Hot Coin Order Size Exceeds Cap: $${hotSettings.orderNotionalUsd.toFixed(2)} exceeds $${hotSettings.maxNotionalUsd.toFixed(2)} limit.`,
    )
  }
  guards.push({
    id: 'hot_notional_cap',
    name: 'Hot Coin Entry Budget',
    passed: notionalPassed,
    status: notionalPassed ? 'ok' : 'blocked',
    currentValue: `$${hotSettings.orderNotionalUsd.toFixed(2)}`,
    thresholdOrLimit: `Max $${hotSettings.maxNotionalUsd.toFixed(2)}/coin`,
    message: notionalPassed ? 'Per-coin budget within limits' : 'Per-coin budget exceeds hard cap',
  })

  // 4. Hot Coins 24h Daily Loss Limit
  const dailyLossLimit = hotSettings.dailyLossLimitUsd
  const lossBreached = dailyLossLimit > 0 && realisedPnl24h <= -dailyLossLimit
  if (lossBreached) {
    blockers.push(
      `Hot Coins Daily Loss Limit REACHED: 24h loss (-$${Math.abs(realisedPnl24h).toFixed(2)}) reached -$${dailyLossLimit.toFixed(2)} ceiling.`,
    )
  }
  guards.push({
    id: 'hot_daily_loss',
    name: 'Hot Coins 24h Loss Ceiling',
    passed: !lossBreached,
    status: lossBreached ? 'blocked' : 'ok',
    currentValue: realisedPnl24h < 0 ? `-$${Math.abs(realisedPnl24h).toFixed(2)}` : `+$${realisedPnl24h.toFixed(2)}`,
    thresholdOrLimit: dailyLossLimit > 0 ? `Max Loss -$${dailyLossLimit.toFixed(2)}` : 'Unlimited',
    message: lossBreached ? 'Loss ceiling breached' : 'Loss within ceiling',
  })

  // 5. Hot Coins 24h Trade Count Limit
  const maxTrades = hotSettings.maxDailyTrades
  const tradesBreached = maxTrades > 0 && tradesCount24h >= maxTrades
  if (tradesBreached) {
    blockers.push(`Hot Coins 24h Trades Ceiling REACHED: ${tradesCount24h}/${maxTrades} hot coin trades executed today.`)
  }
  guards.push({
    id: 'hot_daily_trades',
    name: 'Hot Coins 24h Trade Ceiling',
    passed: !tradesBreached,
    status: tradesBreached ? 'blocked' : 'ok',
    currentValue: `${tradesCount24h} trades`,
    thresholdOrLimit: maxTrades > 0 ? `Max ${maxTrades} trades/day` : 'Unlimited',
    message: tradesBreached ? 'Trade ceiling reached' : `${tradesCount24h}/${maxTrades} used`,
  })

  return { guards, blockers, warnings }
}

/**
 * Calculates a LimitMeter progress structure given current value and threshold.
 */
function buildLimitMeter(current: number, limit: number, unit: 'USD' | 'trades'): LimitMeter {
  if (limit <= 0) {
    return {
      current,
      limit,
      remaining: 999999,
      percentUsed: 0,
      status: 'safe',
      unit,
    }
  }

  if (unit === 'USD') {
    // Loss is measured in negative USD (e.g. current = -12.50, limit = 50.00)
    const currentAbsLoss = current < 0 ? Math.abs(current) : 0
    const percentUsed = Math.min(100, Math.round((currentAbsLoss / limit) * 100))
    const remaining = Math.max(0, limit - currentAbsLoss)
    const status = currentAbsLoss >= limit ? 'breached' : currentAbsLoss >= limit * 0.75 ? 'warning' : 'safe'

    return {
      current: currentAbsLoss,
      limit,
      remaining,
      percentUsed,
      status,
      unit,
    }
  }

  // Unit: trades count
  const percentUsed = Math.min(100, Math.round((current / limit) * 100))
  const remaining = Math.max(0, limit - current)
  const status = current >= limit ? 'breached' : current >= Math.floor(limit * 0.8) ? 'warning' : 'safe'

  return {
    current,
    limit,
    remaining,
    percentUsed,
    status,
    unit,
  }
}

/**
 * Analyzes all recorded trade orders and generates the volume & trading breakdown
 * between Hot Coins and Primary/Other Coins.
 */
export function analyzeTradingBreakdown(
  orders: StoredTradeOrder[],
  primarySymbol: string = config.symbol,
  isDryRun: boolean = true,
): TradingActivityBreakdown {
  const coinMap = new Map<
    string,
    {
      totalOrders: number
      buysCount: number
      sellsCount: number
      volumeUsd: number
      realisedPnlUsd: number
      wins: number
      losses: number
      lastTradedAt: number | null
    }
  >()

  function getCoinEntry(sym: string) {
    let entry = coinMap.get(sym)
    if (!entry) {
      entry = {
        totalOrders: 0,
        buysCount: 0,
        sellsCount: 0,
        volumeUsd: 0,
        realisedPnlUsd: 0,
        wins: 0,
        losses: 0,
        lastTradedAt: null,
      }
      coinMap.set(sym, entry)
    }
    return entry
  }

  for (const o of orders) {
    const entry = getCoinEntry(o.symbol)
    entry.totalOrders++
    if (!entry.lastTradedAt || o.createdAt > entry.lastTradedAt) {
      entry.lastTradedAt = o.createdAt
    }

    // Only count executed trades towards volume & pnl
    if (o.status === 'placed' || o.status === 'dry-run') {
      entry.volumeUsd += o.notionalUsd ?? 0
      if (o.side === 'BUY') entry.buysCount++
      if (o.side === 'SELL') {
        entry.sellsCount++
        if (o.realisedPnlUsd != null) {
          entry.realisedPnlUsd += o.realisedPnlUsd
          if (o.realisedPnlUsd > 0) entry.wins++
          else if (o.realisedPnlUsd < 0) entry.losses++
        }
      }
    }
  }

  // Active positions
  let primaryOpenPosition = null
  try {
    if (isDryRun) {
      const dry = getOpenDryRunPosition(primarySymbol)
      if (dry) {
        primaryOpenPosition = {
          symbol: dry.order.symbol,
          side: dry.side,
          quantity: dry.order.quantity,
          price: dry.order.price ?? null,
          notionalUsd: dry.order.notionalUsd,
          createdAt: dry.order.createdAt,
        }
      }
    } else {
      const live = getOpenBuyPosition(primarySymbol)
      if (live) {
        primaryOpenPosition = {
          symbol: live.symbol,
          side: live.side,
          quantity: live.quantity,
          price: live.price ?? null,
          notionalUsd: live.notionalUsd,
          createdAt: live.createdAt,
        }
      }
    }
  } catch {}

  const hotPositions = getActiveHotCoinPositions(isDryRun)
  const hotOpenSymbols = new Set(hotPositions.map((p) => p.symbol))

  // Compile Primary stats
  const primData = coinMap.get(primarySymbol) ?? {
    totalOrders: 0,
    buysCount: 0,
    sellsCount: 0,
    volumeUsd: 0,
    realisedPnlUsd: 0,
    wins: 0,
    losses: 0,
    lastTradedAt: null,
  }
  const primClosed = primData.wins + primData.losses
  const primWinRate = primClosed > 0 ? (primData.wins / primClosed) * 100 : 0

  const primaryStats = {
    symbol: primarySymbol,
    totalOrders: primData.totalOrders,
    executedBuys: primData.buysCount,
    executedSells: primData.sellsCount,
    volumeUsd: primData.volumeUsd,
    realisedPnlUsd: primData.realisedPnlUsd,
    winRatePct: Math.round(primWinRate * 10) / 10,
    openPosition: primaryOpenPosition,
  }

  // Compile Hot Coins stats
  const hotCoinList: TradingActivityCoinStats[] = []
  let hotTotalOrders = 0
  let hotBuys = 0
  let hotSells = 0
  let hotVolumeUsd = 0
  let hotRealisedPnl = 0
  let hotWins = 0
  let hotLosses = 0

  for (const [sym, data] of coinMap.entries()) {
    if (sym === primarySymbol) continue

    const closed = data.wins + data.losses
    const winRate = closed > 0 ? (data.wins / closed) * 100 : 0
    const hasOpen = hotOpenSymbols.has(sym)

    hotCoinList.push({
      symbol: sym,
      category: 'hot-coin',
      totalOrders: data.totalOrders,
      buysCount: data.buysCount,
      sellsCount: data.sellsCount,
      volumeUsd: data.volumeUsd,
      realisedPnlUsd: data.realisedPnlUsd,
      winRatePct: Math.round(winRate * 10) / 10,
      winningTrades: data.wins,
      losingTrades: data.losses,
      hasOpenPosition: hasOpen,
      lastTradedAt: data.lastTradedAt,
    })

    hotTotalOrders += data.totalOrders
    hotBuys += data.buysCount
    hotSells += data.sellsCount
    hotVolumeUsd += data.volumeUsd
    hotRealisedPnl += data.realisedPnlUsd
    hotWins += data.wins
    hotLosses += data.losses
  }

  // Sort hot coins by highest volume traded
  hotCoinList.sort((a, b) => b.volumeUsd - a.volumeUsd)

  const hotClosed = hotWins + hotLosses
  const hotWinRate = hotClosed > 0 ? (hotWins / hotClosed) * 100 : 0

  const hotStats = {
    totalOrders: hotTotalOrders,
    executedBuys: hotBuys,
    executedSells: hotSells,
    volumeUsd: hotVolumeUsd,
    realisedPnlUsd: hotRealisedPnl,
    winRatePct: Math.round(hotWinRate * 10) / 10,
    activePositionsCount: hotPositions.length,
    coins: hotCoinList,
  }

  // Summary
  const grandTotalWins = primData.wins + hotWins
  const grandTotalLosses = primData.losses + hotLosses
  const grandTotalClosed = grandTotalWins + grandTotalLosses
  const grandWinRate = grandTotalClosed > 0 ? (grandTotalWins / grandTotalClosed) * 100 : 0

  const summary = {
    totalVolumeUsd: primaryStats.volumeUsd + hotStats.volumeUsd,
    totalRealisedPnlUsd: primaryStats.realisedPnlUsd + hotStats.realisedPnlUsd,
    totalOrders: primaryStats.totalOrders + hotStats.totalOrders,
    executedBuys: primaryStats.executedBuys + hotStats.executedBuys,
    executedSells: primaryStats.executedSells + hotStats.executedSells,
    overallWinRatePct: Math.round(grandWinRate * 10) / 10,
    activePositionsCount: (primaryOpenPosition ? 1 : 0) + hotPositions.length,
  }

  return {
    summary,
    primary: primaryStats,
    hotCoins: hotStats,
  }
}

/**
 * Builds the comprehensive Config & Execution Diagnostic Report.
 */
export function generateConfigReport(targetSymbol: string = config.symbol): FullConfigReport {
  const exSettings = getExchangeSettings()
  const hotSettings = getHotCoinSettings()

  let orders: StoredTradeOrder[] = []
  let primaryPnl24h = 0
  let primaryTrades24h = 0
  let hotPnl24h = 0
  let hotTrades24h = 0

  try {
    orders = getRecentTradeOrders(500)
    primaryPnl24h = realisedPnlSince(Date.now() - DAY_MS, targetSymbol)
    primaryTrades24h = countTradesSince(Date.now() - DAY_MS, targetSymbol)

    // Compute 24h PnL and trades across all non-primary coins (hot coins)
    const since = Date.now() - DAY_MS
    for (const o of orders) {
      if (o.symbol !== targetSymbol && o.createdAt >= since) {
        if (o.side === 'BUY' && (o.status === 'placed' || o.status === 'dry-run')) {
          hotTrades24h++
        }
        if (o.side === 'SELL' && o.realisedPnlUsd != null) {
          hotPnl24h += o.realisedPnlUsd
        }
      }
    }
  } catch {
    // Stateless fallback
  }

  // Primary evaluation
  const primaryEval = evaluatePrimaryGuards({
    settings: exSettings,
    primarySymbol: targetSymbol,
    realisedPnl24h: primaryPnl24h,
    tradesCount24h: primaryTrades24h,
  })

  // Hot coins evaluation
  const hotEval = evaluateHotCoinsGuards({
    hotSettings,
    exSettings,
    realisedPnl24h: hotPnl24h,
    tradesCount24h: hotTrades24h,
  })

  // All blockers & warnings
  const allBlockers = Array.from(new Set([...primaryEval.blockers, ...hotEval.blockers]))
  const allWarnings = Array.from(new Set([...primaryEval.warnings, ...hotEval.warnings]))

  // Overall verdict
  let overallStatus: 'READY' | 'PARTIALLY_BLOCKED' | 'BLOCKED' = 'READY'
  let headline = 'All execution guards are healthy. The engine is ready to place orders.'

  const primaryBlocked = primaryEval.blockers.length > 0
  const hotBlocked = hotEval.blockers.length > 0

  if (primaryBlocked && hotBlocked) {
    overallStatus = 'BLOCKED'
    headline = `Execution is BLOCKED by ${allBlockers.length} active constraint${allBlockers.length > 1 ? 's' : ''}.`
  } else if (primaryBlocked || hotBlocked) {
    overallStatus = 'PARTIALLY_BLOCKED'
    headline = primaryBlocked
      ? 'Primary Strategy is BLOCKED; Hot Coins trading is operational.'
      : 'Hot Coins trading is BLOCKED; Primary Strategy is operational.'
  }

  // Primary readiness
  const primaryReadiness: StrategyReadiness = {
    strategyName: `Primary Strategy (${targetSymbol})`,
    status: primaryBlocked ? 'BLOCKED' : primaryEval.warnings.length > 0 ? 'PARTIALLY_BLOCKED' : 'READY',
    enabled: exSettings.enabled,
    dryRun: exSettings.dryRun,
    testnet: exSettings.testnet,
    environment: exSettings.dryRun ? 'dry-run' : exSettings.testnet ? 'testnet' : 'live',
    blockers: primaryEval.blockers,
    warnings: primaryEval.warnings,
    guards: primaryEval.guards,
  }

  // Hot coins readiness
  const hotCoinsReadiness: StrategyReadiness = {
    strategyName: `Hot Coins Scanner (Top ${hotSettings.topCoinsCount})`,
    status: hotBlocked ? 'BLOCKED' : hotEval.warnings.length > 0 ? 'PARTIALLY_BLOCKED' : 'READY',
    enabled: hotSettings.enabled,
    dryRun: hotSettings.dryRun,
    testnet: exSettings.testnet,
    environment: hotSettings.dryRun ? 'dry-run' : exSettings.testnet ? 'testnet' : 'live',
    blockers: hotEval.blockers,
    warnings: hotEval.warnings,
    guards: hotEval.guards,
  }

  // Limit meters
  const limits = {
    primaryDailyLoss: buildLimitMeter(primaryPnl24h, exSettings.dailyLossLimitUsd, 'USD'),
    primaryDailyTrades: buildLimitMeter(primaryTrades24h, exSettings.maxDailyTrades, 'trades'),
    hotCoinsDailyLoss: buildLimitMeter(hotPnl24h, hotSettings.dailyLossLimitUsd, 'USD'),
    hotCoinsDailyTrades: buildLimitMeter(hotTrades24h, hotSettings.maxDailyTrades, 'trades'),
    maxNotionalUsd: exSettings.maxNotionalUsd,
    hotCoinsMaxNotionalUsd: hotSettings.maxNotionalUsd,
  }

  // Trading activity breakdown
  const tradingBreakdown = analyzeTradingBreakdown(orders, targetSymbol, exSettings.dryRun)

  // Recent refused orders
  const recentRefusals: RecentGuardRefusal[] = orders
    .filter((o) => o.status === 'refused' || o.status === 'skipped')
    .slice(0, 10)
    .map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      symbol: o.symbol,
      side: o.side,
      notionalUsd: o.notionalUsd,
      reason: o.reason ?? 'Guard refusal',
    }))

  return {
    timestamp: Date.now(),
    verdict: {
      overallStatus,
      headline,
      activeBlockers: allBlockers,
      activeWarnings: allWarnings,
    },
    primaryReadiness,
    hotCoinsReadiness,
    limits,
    tradingBreakdown,
    recentRefusals,
  }
}
