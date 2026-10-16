import { config } from '@/lib/config'
import { computeIndicators } from '@/lib/indicators'
import type { Candle, RegimeInfo, Signal, SignalDirection } from '@/lib/types'
import { round } from '@/lib/utils'
import { buildTradePlan, trendRead } from './plan'
import { scoreIndicators } from './scoring'

export type SignalContext = {
  symbol?: string
  timeframe?: string
  /** Overrides the last candle close (e.g. a live ticker price). */
  price?: number
  chainlinkPrice?: number | null
  divergencePct?: number | null
  timestamp?: number
}

/** Thresholds scaled by the ATR volatility multiplier. */
export function effectiveThresholds(regime: RegimeInfo): { long: number; short: number } {
  return {
    long: round(config.thresholds.long * regime.thresholdMultiplier, 1),
    short: round(config.thresholds.short * regime.thresholdMultiplier, 1),
  }
}

/** Map a composite score onto a direction using the given thresholds. */
export function decideDirection(
  score: number,
  thresholds: { long: number; short: number } = config.thresholds,
): SignalDirection {
  if (score >= thresholds.long) return 'LONG'
  if (score <= thresholds.short) return 'SHORT'
  return 'NEUTRAL'
}

/**
 * Run the full pipeline over a candle series and produce one `Signal`.
 *
 * Pure function — no I/O — which is what lets the backtester reuse the exact
 * same logic that runs live.
 */
export function generateSignal(candles: Candle[], ctx: SignalContext = {}): Signal {
  const bundle = computeIndicators(candles)
  const { composite, indicators, regime, confluence, reasons } = scoreIndicators(bundle)

  const last = candles[candles.length - 1]
  const price = ctx.price ?? last?.close ?? 0

  // ATR makes the bar for a signal higher when volatility is elevated.
  const thresholdsUsed = effectiveThresholds(regime)
  const direction = decideDirection(composite, thresholdsUsed)

  // Concrete, actionable levels — including the trend gate that refuses to buy
  // into a confirmed downtrend.
  const plan = buildTradePlan({
    direction,
    price,
    score: composite,
    regime,
    confluence,
    trend: trendRead(bundle),
  })

  const summary: string[] = []
  if (direction === 'LONG') {
    summary.push(`Bullish setup — composite ${composite} ≥ ${thresholdsUsed.long}`)
  } else if (direction === 'SHORT') {
    summary.push(`Bearish setup — composite ${composite} ≤ ${thresholdsUsed.short}`)
  } else {
    summary.push(
      `No edge — composite ${composite} inside ${thresholdsUsed.short}…${thresholdsUsed.long}`,
    )
  }
  summary.push(...reasons)

  return {
    symbol: ctx.symbol ?? config.symbol,
    timeframe: ctx.timeframe ?? config.timeframe,
    direction,
    score: composite,
    confidence: round(Math.abs(composite), 1),
    price: round(price, 2),
    chainlinkPrice: ctx.chainlinkPrice ?? null,
    divergencePct: ctx.divergencePct ?? null,
    timestamp: ctx.timestamp ?? Date.now(),
    regime,
    confluence,
    thresholdsUsed,
    plan,
    indicators,
    reasons: summary,
  }
}

