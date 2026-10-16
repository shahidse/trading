import { config } from '@/lib/config'
import { generateSignal } from '@/lib/signal/engine'
import type { Candle, SignalDirection } from '@/lib/types'
import { round } from '@/lib/utils'

export type TradeExitReason = 'stop' | 'target' | 'signal' | 'end-of-data'

export type BacktestTrade = {
  entryTime: number
  exitTime: number
  entryPrice: number
  exitPrice: number
  /** Net return in percent, fees included. */
  returnPct: number
  /** Why the position was closed. */
  exitReason: TradeExitReason
  barsHeld: number
}

export type BacktestResult = {
  symbol: string
  timeframe: string
  candles: number
  warmupBars: number
  barsInMarket: number
  exposurePct: number
  trades: BacktestTrade[]
  totalReturnPct: number
  buyHoldReturnPct: number
  winRate: number
  avgWinPct: number
  avgLossPct: number
  profitFactor: number
  maxDrawdownPct: number
  signalCounts: Record<SignalDirection, number>
  /** How positions ended: stop, target, signal, or still open at the last bar. */
  exits: Record<TradeExitReason, number>
  /** LONG signals refused by the trend gate (or missing ATR levels). */
  blockedEntries: number
  stopAtrMultiple: number
  rewardMultiple: number
}

export type BacktestOptions = {
  /**
   * Bars skipped before trading starts. 210 covers the slowest indicator
   * (EMA200), so every bar is scored with the full indicator set.
   */
  warmup?: number
  /** Close an open position when the signal turns NEUTRAL (ignored with a plan). */
  exitOnNeutral?: boolean
  /** Fee per side, in percent. */
  feePct?: number
  symbol?: string
  timeframe?: string
  /**
   * Use the trade plan: the trend gate blocks counter-trend longs, and ATR
   * stops/targets close positions. Set `false` for the raw signal-only baseline.
   */
  useTradePlan?: boolean
}

/**
 * Replay the strategy bar-by-bar over historical candles.
 *
 * With `useTradePlan` (the default) a position opens only when the plan says
 * BUY, and closes on whichever comes first: the ATR stop, the ATR target, or a
 * SELL signal. Stops are checked before targets within a bar — the conservative
 * assumption when a single bar touches both.
 */
export function runBacktest(candles: Candle[], options: BacktestOptions = {}): BacktestResult {
  const warmup = options.warmup ?? 210
  const exitOnNeutral = options.exitOnNeutral ?? false
  const fee = (options.feePct ?? 0.1) / 100
  const useTradePlan = options.useTradePlan ?? true
  const symbol = options.symbol ?? config.symbol
  const timeframe = options.timeframe ?? config.timeframe

  const signalCounts: Record<SignalDirection, number> = { LONG: 0, SHORT: 0, NEUTRAL: 0 }
  const exits: Record<TradeExitReason, number> = {
    stop: 0,
    target: 0,
    signal: 0,
    'end-of-data': 0,
  }
  const trades: BacktestTrade[] = []

  let equity = 1
  let peak = 1
  let maxDrawdown = 0
  let barsInMarket = 0
  let barsTotal = 0
  let blockedEntries = 0

  let inPosition = false
  let entryPrice = 0
  let entryTime = 0
  let entryIndex = 0
  let stopPrice: number | null = null
  let targetPrice: number | null = null

  const startIndex = Math.max(warmup, 1)

  /** Exit value of one unit, net of fees on both sides. */
  const netProceeds = (exitPrice: number) => (exitPrice * (1 - fee)) / (entryPrice * (1 + fee))

  function closePosition(index: number, price: number, reason: TradeExitReason): void {
    const proceeds = netProceeds(price)
    equity *= proceeds
    trades.push({
      entryTime,
      exitTime: candles[index].time,
      entryPrice: round(entryPrice, 2),
      exitPrice: round(price, 2),
      returnPct: round((proceeds - 1) * 100, 2),
      exitReason: reason,
      barsHeld: index - entryIndex,
    })
    exits[reason]++
    inPosition = false
    stopPrice = null
    targetPrice = null
  }

  for (let i = startIndex; i < candles.length; i++) {
    const bar = candles[i]
    const signal = generateSignal(candles.slice(0, i + 1), {
      symbol,
      timeframe,
      timestamp: bar.time,
    })
    signalCounts[signal.direction]++

    // Count every gate rejection, including while already in a position.
    if (useTradePlan && signal.plan.gate === 'blocked-by-trend') blockedEntries++

    // --- 1. manage an open position ---
    if (inPosition) {
      if (stopPrice != null && bar.low <= stopPrice) {
        closePosition(i, stopPrice, 'stop')
      } else if (targetPrice != null && bar.high >= targetPrice) {
        closePosition(i, targetPrice, 'target')
      } else {
        const wantsExit = useTradePlan
          ? signal.plan.action === 'SELL'
          : signal.direction === 'SHORT' || (exitOnNeutral && signal.direction === 'NEUTRAL')
        if (wantsExit) closePosition(i, bar.close, 'signal')
      }
    }

    // --- 2. look for an entry ---
    if (!inPosition) {
      if (useTradePlan) {
        if (signal.plan.action === 'BUY' && signal.plan.levels) {
          inPosition = true
          entryPrice = bar.close
          entryTime = bar.time
          entryIndex = i
          stopPrice = signal.plan.levels.stopLoss
          targetPrice = signal.plan.levels.takeProfit
        }
      } else if (signal.direction === 'LONG') {
        inPosition = true
        entryPrice = bar.close
        entryTime = bar.time
        entryIndex = i
        stopPrice = null
        targetPrice = null
      }
    }

    // --- 3. mark to market, for the drawdown curve ---
    if (i + 1 < candles.length) {
      const mark = inPosition ? equity * netProceeds(candles[i + 1].close) : equity
      if (inPosition) barsInMarket++
      barsTotal++
      peak = Math.max(peak, mark)
      maxDrawdown = Math.max(maxDrawdown, (peak - mark) / peak)
    }
  }

  // Close any position still open on the final bar.
  if (inPosition) {
    closePosition(candles.length - 1, candles[candles.length - 1].close, 'end-of-data')
  }

  const wins = trades.filter((t) => t.returnPct > 0)
  const losses = trades.filter((t) => t.returnPct <= 0)
  const grossProfit = wins.reduce((s, t) => s + t.returnPct, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.returnPct, 0))

  const firstClose = candles[startIndex].close
  const lastClose = candles[candles.length - 1].close

  return {
    symbol,
    timeframe,
    candles: candles.length,
    warmupBars: startIndex,
    barsInMarket,
    exposurePct: barsTotal === 0 ? 0 : round((barsInMarket / barsTotal) * 100, 1),
    trades,
    totalReturnPct: round((equity - 1) * 100, 2),
    buyHoldReturnPct: round((lastClose / firstClose - 1) * 100, 2),
    winRate: trades.length === 0 ? 0 : round((wins.length / trades.length) * 100, 1),
    avgWinPct: wins.length === 0 ? 0 : round(grossProfit / wins.length, 2),
    avgLossPct: losses.length === 0 ? 0 : round(grossLoss / losses.length, 2),
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : round(grossProfit / grossLoss, 2),
    maxDrawdownPct: round(maxDrawdown * 100, 2),
    signalCounts,
    exits,
    blockedEntries,
    stopAtrMultiple: config.trade.stopAtrMultiple,
    rewardMultiple: config.trade.rewardMultiple,
  }
}

