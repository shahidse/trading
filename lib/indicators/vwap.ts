import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type VwapResult = {
  vwap: number
  deviationPct: number
  score: number
  detail: string
}

/**
 * Rolling VWAP (default 96 × 15m = 24 hours).
 *
 * A rolling window is used rather than a cumulative VWAP, because a cumulative
 * average over 300 candles is dominated by the oldest data and stops responding.
 *
 * Price below VWAP is treated as bullish (mean-reversion up) and price above as
 * bearish, with a deadband so that sitting essentially *at* VWAP scores zero.
 */
export function vwap(
  candles: Candle[],
  opts = { window: 96, deadband: 0.15 },
): VwapResult | null {
  const window = Math.min(opts.window, candles.length)
  if (window < 20) return null

  const slice = candles.slice(-window)
  let priceVolume = 0
  let totalVolume = 0

  for (const c of slice) {
    const typicalPrice = (c.high + c.low + c.close) / 3
    priceVolume += typicalPrice * c.volume
    totalVolume += c.volume
  }

  if (totalVolume === 0) return null

  const vwapValue = priceVolume / totalVolume
  const close = candles[candles.length - 1].close
  const deviationPct = ((close - vwapValue) / vwapValue) * 100

  let score = 0
  if (deviationPct > opts.deadband) {
    score = clamp(-(deviationPct - opts.deadband) * 50, -100, 0)
  } else if (deviationPct < -opts.deadband) {
    score = clamp(-(deviationPct + opts.deadband) * 50, 0, 100)
  }

  let detail: string
  if (Math.abs(deviationPct) <= opts.deadband) detail = 'Price at VWAP — no edge'
  else if (deviationPct > 0) detail = `Price ${round(deviationPct, 2)}% above VWAP (stretched)`
  else detail = `Price ${round(Math.abs(deviationPct), 2)}% below VWAP (discounted)`

  return {
    vwap: round(vwapValue, 2),
    deviationPct: round(deviationPct, 3),
    score: round(score, 1),
    detail,
  }
}
