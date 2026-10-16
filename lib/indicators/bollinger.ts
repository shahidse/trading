import { BollingerBands } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { clamp, percentileRank, round } from '@/lib/utils'

export type BollingerResult = {
  upper: number
  middle: number
  lower: number
  /** (upper - lower) / middle — volatility measure. */
  bandwidth: number
  /** Percent-B: where price sits inside the bands (0 = lower, 1 = upper). */
  percentB: number
  /** True when bandwidth is in the lowest 20% of the recent range. */
  squeeze: boolean
  score: number
  detail: string
}

/**
 * Bollinger Bands (default 20 period, 2 standard deviations).
 *
 * Mean-reversion reading: price at/below the lower band is bullish (+),
 * price at/above the upper band is bearish (-). A squeeze halves the score
 * because bands compress before breakouts, where mean reversion fails.
 */
export function bollinger(
  candles: Candle[],
  period = 20,
  stdDev = 2,
): BollingerResult | null {
  const closes = candles.map((c) => c.close)
  if (closes.length < period) return null

  const series = BollingerBands.calculate({ period, stdDev, values: closes })
  if (series.length === 0) return null

  const last = series[series.length - 1]
  const close = closes[closes.length - 1]

  const bandwidthSeries = series.map((b) =>
    b.middle === 0 ? 0 : (b.upper - b.lower) / b.middle,
  )
  const bandwidth = bandwidthSeries[bandwidthSeries.length - 1]
  const recent = bandwidthSeries.slice(-100)
  const squeeze = percentileRank(recent, bandwidth) <= 0.2

  const range = last.upper - last.lower
  const percentB = range === 0 ? 0.5 : (close - last.lower) / range

  // Only the extremes move the score. The middle of the bands is genuinely
  // neutral — otherwise Bollinger hands out a permanent small bias that
  // cancels out the trend reading from Ichimoku.
  const EDGE = 0.2
  let score = 0
  if (percentB >= 1) score = -100
  else if (percentB <= 0) score = 100
  else if (percentB > 1 - EDGE) score = -((percentB - (1 - EDGE)) / EDGE) * 100
  else if (percentB < EDGE) score = ((EDGE - percentB) / EDGE) * 100
  if (squeeze) score *= 0.5

  let detail: string
  if (percentB <= 0) detail = 'Price at/below lower band — oversold (bullish)'
  else if (percentB >= 1) detail = 'Price at/above upper band — overbought (bearish)'
  else if (percentB > 1 - EDGE) detail = 'Price pressing the upper band'
  else if (percentB < EDGE) detail = 'Price pressing the lower band'
  else detail = 'Price mid-band — no edge'
  if (squeeze) detail += ' · squeeze (low volatility)'

  return {
    upper: round(last.upper),
    middle: round(last.middle),
    lower: round(last.lower),
    bandwidth: round(bandwidth, 4),
    percentB: round(percentB, 3),
    squeeze,
    score: round(clamp(score), 1),
    detail,
  }
}
