import { MACD } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type MacdResult = {
  macd: number
  signal: number
  histogram: number
  zeroLine: 'above' | 'below'
  freshCross: 'bullish' | 'bearish' | null
  score: number
  detail: string
}

/**
 * MACD (12 / 26 / 9).
 *
 * The histogram is normalised against its own recent average magnitude, so a
 * reading means "unusually strong momentum" rather than an absolute number
 * that means different things at different price levels.
 *
 *  - histogram magnitude: up to ±80
 *  - MACD line above/below zero: ±10
 *  - fresh signal-line cross within the last bar: ±10
 */
export function macd(
  candles: Candle[],
  opts = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
): MacdResult | null {
  const values = candles.map((c) => c.close)
  if (values.length < opts.slowPeriod + opts.signalPeriod + 5) return null

  const raw = MACD.calculate({
    values,
    fastPeriod: opts.fastPeriod,
    slowPeriod: opts.slowPeriod,
    signalPeriod: opts.signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })

  const series = raw
    .filter(
      (r) =>
        typeof r.MACD === 'number' &&
        typeof r.signal === 'number' &&
        typeof r.histogram === 'number',
    )
    .map((r) => ({
      MACD: r.MACD as number,
      signal: r.signal as number,
      histogram: r.histogram as number,
    }))

  if (series.length < 5) return null

  const last = series[series.length - 1]
  const prev = series[series.length - 2]

  const recent = series.slice(-50)
  const avgAbsHistogram =
    recent.reduce((sum, r) => sum + Math.abs(r.histogram), 0) / recent.length || 1

  let score = clamp((last.histogram / avgAbsHistogram) * 40, -80, 80)
  if (last.MACD > 0) score += 10
  else score -= 10

  let freshCross: MacdResult['freshCross'] = null
  if (prev.MACD <= prev.signal && last.MACD > last.signal) {
    freshCross = 'bullish'
    score += 10
  } else if (prev.MACD >= prev.signal && last.MACD < last.signal) {
    freshCross = 'bearish'
    score -= 10
  }

  score = clamp(score)
  const zeroLine: MacdResult['zeroLine'] = last.MACD > 0 ? 'above' : 'below'

  let detail = `Histogram ${last.histogram > 0 ? 'positive' : 'negative'} · MACD ${zeroLine} zero`
  if (freshCross) detail += ` · fresh ${freshCross} cross`

  return {
    macd: round(last.MACD, 3),
    signal: round(last.signal, 3),
    histogram: round(last.histogram, 3),
    zeroLine,
    freshCross,
    score: round(score, 1),
    detail,
  }
}
