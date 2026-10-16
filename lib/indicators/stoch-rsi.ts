import { RSI, StochasticRSI } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type StochRsiResult = {
  k: number
  d: number
  score: number
  detail: string
}

/**
 * Stochastic RSI — a faster, more sensitive cousin of RSI used for entry timing.
 *
 * Uses the same neutral-zone shape as RSI (nothing between 40 and 60) so it
 * cannot apply a permanent bias, but ramps faster so it reacts to turning points
 * sooner. The %K/%D relationship adds a ±10 confirmation.
 */
export function stochRsi(
  candles: Candle[],
  opts = { rsiPeriod: 14, stochasticPeriod: 14, kPeriod: 3, dPeriod: 3 },
): StochRsiResult | null {
  const values = candles.map((c) => c.close)
  const minBars = opts.rsiPeriod + opts.stochasticPeriod + opts.kPeriod + 2
  if (values.length < minBars) return null

  const raw = StochasticRSI.calculate({
    values,
    rsiPeriod: opts.rsiPeriod,
    stochasticPeriod: opts.stochasticPeriod,
    kPeriod: opts.kPeriod,
    dPeriod: opts.dPeriod,
  })

  const series = raw
    .filter((r) => typeof r.k === 'number' && typeof r.d === 'number')
    .map((r) => ({ k: r.k as number, d: r.d as number }))

  if (series.length === 0) return null

  const last = series[series.length - 1]
  const { k, d } = last

  // Degenerate guard: in a perfectly monotonic run RSI pins at 0 or 100, so its
  // range over the window collapses to zero and the oscillator is meaningless.
  // The library returns 0 in that case, which would falsely read as "oversold".
  const rsiSeries = RSI.calculate({ period: opts.rsiPeriod, values })
  const recentRsi = rsiSeries.slice(-opts.stochasticPeriod)
  const rsiRange = recentRsi.length > 0 ? Math.max(...recentRsi) - Math.min(...recentRsi) : 0
  if (rsiRange < 1) {
    return {
      k: round(k, 2),
      d: round(d, 2),
      score: 0,
      detail: 'RSI range flat — oscillator degenerate (no signal)',
    }
  }

  let score = 0
  if (k <= 20) score = clamp(60 + (20 - k) * 2)
  else if (k >= 80) score = -clamp(60 + (k - 80) * 2)
  else if (k < 40) score = (40 - k) * 3
  else if (k > 60) score = -(k - 60) * 3

  // %K crossing %D is a timing confirmation.
  if (k > d) score += 10
  else if (k < d) score -= 10

  score = clamp(score)

  let detail: string
  if (k <= 20) detail = `%K ${round(k, 1)} — oversold (bullish)`
  else if (k >= 80) detail = `%K ${round(k, 1)} — overbought (bearish)`
  else detail = `%K ${round(k, 1)} — neutral`
  detail += ` · %K ${k > d ? '>' : '<'} %D`

  return { k: round(k, 2), d: round(d, 2), score: round(score, 1), detail }
}
