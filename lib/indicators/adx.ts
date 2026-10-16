import { ADX } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { round } from '@/lib/utils'

export type AdxResult = {
  adx: number
  plusDi: number
  minusDi: number
  regime: 'trending' | 'ranging' | 'transitioning'
  direction: 'bullish' | 'bearish' | 'flat'
}

/**
 * ADX (14) — trend *strength*, not direction.
 *
 * This indicator deliberately does not contribute to the score. It selects the
 * regime, and the scoring layer uses that to decide whether to trust the
 * trend-following indicators or the mean-reversion ones. That is what stops
 * Bollinger/RSI from fading a genuine trend.
 *
 *  - ADX >= 25  → trending
 *  - ADX <= 20  → ranging
 *  - in between → transitioning
 *
 * +DI vs -DI supplies the direction of the move.
 */
export function adx(
  candles: Candle[],
  opts = { period: 14, trendingThreshold: 25, rangingThreshold: 20 },
): AdxResult | null {
  const minBars = opts.period * 3
  if (candles.length < minBars) return null

  const high = candles.map((c) => c.high)
  const low = candles.map((c) => c.low)
  const close = candles.map((c) => c.close)

  const series = ADX.calculate({ high, low, close, period: opts.period })
  const last = series[series.length - 1]
  if (!last || typeof last.adx !== 'number') return null

  const value = last.adx
  const regime: AdxResult['regime'] =
    value >= opts.trendingThreshold
      ? 'trending'
      : value <= opts.rangingThreshold
        ? 'ranging'
        : 'transitioning'

  const plusDi = last.pdi ?? 0
  const minusDi = last.mdi ?? 0
  const direction: AdxResult['direction'] =
    Math.abs(plusDi - minusDi) < 1 ? 'flat' : plusDi > minusDi ? 'bullish' : 'bearish'

  return {
    adx: round(value, 2),
    plusDi: round(plusDi, 2),
    minusDi: round(minusDi, 2),
    regime,
    direction,
  }
}
