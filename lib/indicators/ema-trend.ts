import { EMA } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type EmaTrendResult = {
  emaFast: number
  emaMid: number
  emaSlow: number
  alignment: 'bullish' | 'bearish' | 'mixed'
  cross: 'golden' | 'death' | null
  score: number
  detail: string
}

/**
 * EMA trend alignment (20 / 50 / 200).
 *
 * Four independent stacking checks, each worth ±25:
 *   price vs EMA20 · EMA20 vs EMA50 · EMA50 vs EMA200 · price vs EMA200
 *
 * A textbook stack (price > 20 > 50 > 200) scores +100; a fully inverted stack
 * scores -100. A fresh golden/death cross adds ±10.
 */
export function emaTrend(
  candles: Candle[],
  periods = { fast: 20, mid: 50, slow: 200 },
): EmaTrendResult | null {
  const values = candles.map((c) => c.close)
  if (values.length < periods.slow + 5) return null

  const seriesOf = (period: number) => EMA.calculate({ period, values })

  const fastSeries = seriesOf(periods.fast)
  const midSeries = seriesOf(periods.mid)
  const slowSeries = seriesOf(periods.slow)

  const emaFast = fastSeries[fastSeries.length - 1]
  const emaMid = midSeries[midSeries.length - 1]
  const emaSlow = slowSeries[slowSeries.length - 1]
  const close = values[values.length - 1]

  if (![emaFast, emaMid, emaSlow].every((v) => typeof v === 'number')) return null

  let score = 0
  score += close > emaFast ? 25 : -25
  score += emaFast > emaMid ? 25 : -25
  score += emaMid > emaSlow ? 25 : -25
  score += close > emaSlow ? 25 : -25

  const alignment: EmaTrendResult['alignment'] =
    emaFast > emaMid && emaMid > emaSlow
      ? 'bullish'
      : emaFast < emaMid && emaMid < emaSlow
        ? 'bearish'
        : 'mixed'

  // Fresh EMA20/EMA50 cross within the last 3 bars (index from the end).
  let cross: EmaTrendResult['cross'] = null
  const available = Math.min(3, Math.min(fastSeries.length, midSeries.length) - 1)
  for (let offset = available; offset >= 1; offset--) {
    const fastPrev = fastSeries[fastSeries.length - offset - 1]
    const midPrev = midSeries[midSeries.length - offset - 1]
    const fastNow = fastSeries[fastSeries.length - offset]
    const midNow = midSeries[midSeries.length - offset]

    if (fastPrev <= midPrev && fastNow > midNow) cross = 'golden'
    else if (fastPrev >= midPrev && fastNow < midNow) cross = 'death'
  }

  if (cross === 'golden') score += 10
  if (cross === 'death') score -= 10

  score = clamp(score)

  let detail: string
  if (alignment === 'bullish') detail = 'EMAs stacked bullish (20 > 50 > 200)'
  else if (alignment === 'bearish') detail = 'EMAs stacked bearish (20 < 50 < 200)'
  else detail = 'EMAs mixed — no clean trend stack'
  if (cross) detail += ` · fresh ${cross} cross`

  return {
    emaFast: round(emaFast, 2),
    emaMid: round(emaMid, 2),
    emaSlow: round(emaSlow, 2),
    alignment,
    cross,
    score: round(score, 1),
    detail,
  }
}
