import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type SuperTrendResult = {
  /** The active SuperTrend trailing stop / support-resistance price level. */
  value: number
  /** Market direction according to SuperTrend. */
  direction: 'bullish' | 'bearish'
  /** True if the trend flipped on the latest candle. */
  flipped: boolean
  /** Direction of the flip if flipped on the latest candle, else null. */
  flipDirection: 'bullish' | 'bearish' | null
  /** How many candles ago the current trend began (0 = this bar). */
  barsSinceFlip: number
  upperBand: number
  lowerBand: number
  atr: number
  /** Distance of close price from SuperTrend line in percent (positive = above). */
  distancePct: number
  /** Score in [-100, +100] representing scalping conviction. */
  score: number
  detail: string
}

export type SuperTrendOptions = {
  period?: number
  multiplier?: number
}

/**
 * SuperTrend Indicator (ATR-based trailing trend and dynamic stop/support).
 *
 * Highly prized for 15m crypto scalping:
 * - Plots a volatility-adjusted trailing line that flips between support (bullish) and resistance (bearish).
 * - Delivers immediate flip trigger alerts on trend reversals.
 * - Gives precise ATR trailing stop-loss levels for active scalp risk management.
 */
export function supertrend(
  candles: Candle[],
  options: SuperTrendOptions = {},
): SuperTrendResult | null {
  const period = options.period ?? 10
  const multiplier = options.multiplier ?? 3

  if (candles.length < period + 5) return null

  const len = candles.length
  const tr: number[] = new Array(len)
  tr[0] = candles[0].high - candles[0].low

  for (let i = 1; i < len; i++) {
    const hl = candles[i].high - candles[i].low
    const hc = Math.abs(candles[i].high - candles[i - 1].close)
    const lc = Math.abs(candles[i].low - candles[i - 1].close)
    tr[i] = Math.max(hl, hc, lc)
  }

  // Wilder's ATR Smoothing
  const atrValues: number[] = new Array(len)
  let sumTr = 0
  for (let i = 0; i < period; i++) {
    sumTr += tr[i]
  }
  atrValues[period - 1] = sumTr / period

  for (let i = period; i < len; i++) {
    atrValues[i] = (atrValues[i - 1] * (period - 1) + tr[i]) / period
  }

  const upperBand: number[] = new Array(len)
  const lowerBand: number[] = new Array(len)
  const st: number[] = new Array(len)
  const dir: ('bullish' | 'bearish')[] = new Array(len)

  for (let i = period - 1; i < len; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2
    const currentAtr = atrValues[i]
    const basicUpper = hl2 + multiplier * currentAtr
    const basicLower = hl2 - multiplier * currentAtr

    if (i === period - 1) {
      upperBand[i] = basicUpper
      lowerBand[i] = basicLower
      dir[i] = candles[i].close >= basicLower ? 'bullish' : 'bearish'
      st[i] = dir[i] === 'bullish' ? lowerBand[i] : upperBand[i]
      continue
    }

    const prevUpper = upperBand[i - 1]
    const prevLower = lowerBand[i - 1]
    const prevClose = candles[i - 1].close

    upperBand[i] = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper
    lowerBand[i] = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower

    const prevDir = dir[i - 1]
    if (prevDir === 'bullish') {
      if (candles[i].close < lowerBand[i]) {
        dir[i] = 'bearish'
        st[i] = upperBand[i]
      } else {
        dir[i] = 'bullish'
        st[i] = lowerBand[i]
      }
    } else {
      if (candles[i].close > upperBand[i]) {
        dir[i] = 'bullish'
        st[i] = lowerBand[i]
      } else {
        dir[i] = 'bearish'
        st[i] = upperBand[i]
      }
    }
  }

  const lastIdx = len - 1
  const latestDir = dir[lastIdx]
  const latestVal = st[lastIdx]
  const prevDir = dir[lastIdx - 1]
  const flipped = latestDir !== prevDir
  const flipDirection = flipped ? latestDir : null

  let barsSinceFlip = 0
  for (let i = lastIdx - 1; i >= period - 1; i--) {
    if (dir[i] !== latestDir) {
      break
    }
    barsSinceFlip++
  }

  const close = candles[lastIdx].close
  const distancePct = close > 0 ? ((close - latestVal) / close) * 100 : 0

  // Scalper scoring:
  let score = latestDir === 'bullish' ? 55 : -55

  // Fresh flip bonus: scalpers look for fresh flips to enter right as momentum ignites
  if (barsSinceFlip === 0) {
    score = latestDir === 'bullish' ? 90 : -90
  } else if (barsSinceFlip === 1) {
    score = latestDir === 'bullish' ? 80 : -80
  } else if (barsSinceFlip === 2) {
    score = latestDir === 'bullish' ? 70 : -70
  }

  // Pullback bounce vs overextension
  if (latestDir === 'bullish') {
    if (distancePct <= 1.2 && distancePct >= 0) {
      score += 10 // Healthy consolidation near SuperTrend support
    } else if (distancePct > 3.5) {
      score -= 15 // Overextended, prone to scalp retracement
    }
  } else {
    if (Math.abs(distancePct) <= 1.2 && distancePct <= 0) {
      score -= 10 // Consolidation near resistance
    } else if (Math.abs(distancePct) > 3.5) {
      score += 15 // Overextended downward
    }
  }

  score = clamp(round(score, 1), -100, 100)

  let detail: string
  if (flipped) {
    detail = `SuperTrend flipped ${latestDir.toUpperCase()} at $${round(latestVal, 2)} — fresh scalp trigger`
  } else {
    detail = `SuperTrend ${latestDir} ($${round(latestVal, 2)}) · ${round(Math.abs(distancePct), 2)}% ${
      latestDir === 'bullish' ? 'above support' : 'below resistance'
    } · ${barsSinceFlip} bars ago`
  }

  return {
    value: round(latestVal, 2),
    direction: latestDir,
    flipped,
    flipDirection,
    barsSinceFlip,
    upperBand: round(upperBand[lastIdx], 2),
    lowerBand: round(lowerBand[lastIdx], 2),
    atr: round(atrValues[lastIdx], 2),
    distancePct: round(distancePct, 3),
    score,
    detail,
  }
}
