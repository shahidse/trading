import { RSI } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type RsiResult = {
  value: number
  /** 'bullish' | 'bearish' | null — classic RSI/price divergence. */
  divergence: 'bullish' | 'bearish' | null
  score: number
  detail: string
}

/** Indices of local minima/maxima in a series (simple pivot detection). */
function localExtrema(values: number[], window = 2): { lows: number[]; highs: number[] } {
  const lows: number[] = []
  const highs: number[] = []
  for (let i = window; i < values.length - window; i++) {
    let isLow = true
    let isHigh = true
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue
      if (values[j] < values[i]) isLow = false
      if (values[j] > values[i]) isHigh = false
    }
    if (isLow) lows.push(i)
    if (isHigh) highs.push(i)
  }
  return { lows, highs }
}

/**
 * Relative Strength Index (default 14).
 *
 * Oversold (< 30) is treated as bullish, overbought (> 70) as bearish.
 * Divergence between price and RSI adds a confirmation bonus.
 */
export function rsi(candles: Candle[], period = 14): RsiResult | null {
  const closes = candles.map((c) => c.close)
  if (closes.length < period + 5) return null

  const series = RSI.calculate({ period, values: closes })
  if (series.length === 0) return null

  const value = series[series.length - 1]
  // RSI series is shorter than closes; align indices.
  const offset = closes.length - series.length

  // Neutral zone: 40–60 contributes nothing. Outside it the score ramps up so
  // that 30 → +60 and 20 → +100 (mirrored for overbought). This keeps RSI from
  // applying a constant mild bias in trendless markets.
  let score = 0
  if (value <= 30) score = clamp(60 + (30 - value) * 4)
  else if (value < 40) score = (40 - value) * 6
  else if (value >= 70) score = -clamp(60 + (value - 70) * 4)
  else if (value > 60) score = -(value - 60) * 6

  // --- Divergence detection over the last ~40 bars ---
  let divergence: 'bullish' | 'bearish' | null = null
  const lookback = Math.min(40, series.length)
  const rsiWindow = series.slice(-lookback)
  const priceWindow = closes.slice(offset).slice(-lookback)

  if (rsiWindow.length > 6) {
    const { lows, highs } = localExtrema(priceWindow, 2)
    if (lows.length >= 2) {
      const [a, b] = lows.slice(-2)
      if (priceWindow[b] < priceWindow[a] && rsiWindow[b] > rsiWindow[a]) {
        divergence = 'bullish'
        score = clamp(score + 20)
      }
    }
    if (!divergence && highs.length >= 2) {
      const [a, b] = highs.slice(-2)
      if (priceWindow[b] > priceWindow[a] && rsiWindow[b] < rsiWindow[a]) {
        divergence = 'bearish'
        score = clamp(score - 20)
      }
    }
  }

  let detail: string
  if (value <= 30) detail = `RSI ${round(value, 1)} — oversold (bullish)`
  else if (value >= 70) detail = `RSI ${round(value, 1)} — overbought (bearish)`
  else detail = `RSI ${round(value, 1)} — neutral`
  if (divergence) detail += ` · ${divergence} divergence`

  return {
    value: round(value, 2),
    divergence,
    score: round(score, 1),
    detail,
  }
}
