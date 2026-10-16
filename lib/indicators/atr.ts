import { ATR } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type AtrResult = {
  atr: number
  /** ATR as a percentage of price — comparable across price levels. */
  atrPct: number
  /** Median ATR% over the recent window. */
  medianAtrPct: number
  /** atrPct / medianAtrPct — 1 means "normal volatility right now". */
  volatilityRatio: number
  /** Multiplier applied to the decision threshold. */
  thresholdMultiplier: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export type AtrOptions = {
  period?: number
  adaptive?: boolean
  minMultiplier?: number
  maxMultiplier?: number
}

/**
 * ATR (14) expressed as a percentage of price, used to make the decision
 * threshold adaptive.
 *
 * The idea: in unusually volatile conditions a given composite score is less
 * remarkable, so demand more conviction before firing a signal. `volatilityRatio`
 * is 1 at normal volatility, and the resulting multiplier is clamped so this can
 * only nudge the threshold, never dominate it.
 */
export function atr(candles: Candle[], options: AtrOptions = {}): AtrResult | null {
  const opts = {
    period: 14,
    adaptive: true,
    minMultiplier: 0.8,
    maxMultiplier: 1.4,
    ...options,
  }

  const minBars = opts.period + 30
  if (candles.length < minBars) return null

  const high = candles.map((c) => c.high)
  const low = candles.map((c) => c.low)
  const close = candles.map((c) => c.close)

  const series = ATR.calculate({ high, low, close, period: opts.period })
  if (series.length < 20) return null

  const pctSeries = series.map((value, index) => {
    // Align the ATR series (shorter) with the matching close price.
    const price = close[close.length - series.length + index]
    return price ? (value / price) * 100 : 0
  })

  const atrPct = pctSeries[pctSeries.length - 1]
  const lookback = pctSeries.slice(-Math.min(100, pctSeries.length))
  const medianAtrPct = median(lookback)
  const volatilityRatio = medianAtrPct > 0 ? atrPct / medianAtrPct : 1

  const thresholdMultiplier = opts.adaptive
    ? clamp(volatilityRatio, opts.minMultiplier, opts.maxMultiplier)
    : 1

  return {
    atr: round(series[series.length - 1], 2),
    atrPct: round(atrPct, 3),
    medianAtrPct: round(medianAtrPct, 3),
    volatilityRatio: round(volatilityRatio, 3),
    thresholdMultiplier: round(thresholdMultiplier, 3),
  }
}
