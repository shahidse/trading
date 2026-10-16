import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type PatternKind =
  | 'bullish-engulfing'
  | 'bearish-engulfing'
  | 'piercing-line'
  | 'dark-cloud-cover'
  | 'hammer'
  | 'hanging-man'
  | 'inverted-hammer'
  | 'shooting-star'
  | 'doji'
  | 'morning-star'
  | 'evening-star'
  | 'three-white-soldiers'
  | 'three-black-crows'

export type DetectedPattern = {
  kind: PatternKind
  label: string
  direction: 'bullish' | 'bearish' | 'neutral'
  strength: number
}

export type PatternResult = {
  patterns: DetectedPattern[]
  score: number
  detail: string
}

type Metrics = {
  body: number
  range: number
  upperWick: number
  lowerWick: number
  bullish: boolean
  midpoint: number
}

function metrics(c: Candle): Metrics {
  const body = Math.abs(c.close - c.open)
  return {
    body,
    range: c.high - c.low,
    upperWick: c.high - Math.max(c.open, c.close),
    lowerWick: Math.min(c.open, c.close) - c.low,
    bullish: c.close > c.open,
    midpoint: (c.open + c.close) / 2,
  }
}

/** Very small body relative to the candle's range. */
function isDoji(c: Candle): boolean {
  const m = metrics(c)
  return m.range > 0 && m.body <= m.range * 0.1
}

/** Direction of the trend leading into `index` (exclusive). */
function trendBefore(candles: Candle[], index: number, lookback = 5): 'up' | 'down' | 'flat' {
  const start = Math.max(0, index - lookback)
  if (index - start < 2) return 'flat'
  const from = candles[start].close
  const to = candles[index - 1].close
  const change = (to - from) / from
  if (change > 0.002) return 'up'
  if (change < -0.002) return 'down'
  return 'flat'
}

/**
 * Detect classic reversal / continuation candlestick patterns on the most
 * recent candles. Returns every match plus a signed composite score.
 */
export function patterns(candles: Candle[]): PatternResult | null {
  if (candles.length < 5) return null

  const i = candles.length - 1
  const c = candles[i]
  const p = candles[i - 1]
  const p2 = candles[i - 2]
  const mc = metrics(c)
  const mp = metrics(p)
  const mp2 = metrics(p2)
  const trend = trendBefore(candles, i)

  const found: DetectedPattern[] = []
  const add = (
    kind: PatternKind,
    label: string,
    direction: DetectedPattern['direction'],
    strength: number,
  ) => found.push({ kind, label, direction, strength })

  // ---------- Single-candle patterns ----------
  if (isDoji(c)) add('doji', 'Doji (indecision)', 'neutral', 0)

  const smallUpper = mc.upperWick <= mc.body * 0.5
  const smallLower = mc.lowerWick <= mc.body * 0.5
  const longLower = mc.lowerWick >= mc.body * 2
  const longUpper = mc.upperWick >= mc.body * 2
  const hasBody = mc.body > 0

  if (hasBody && longLower && smallUpper) {
    if (trend === 'down') add('hammer', 'Hammer', 'bullish', 30)
    else if (trend === 'up') add('hanging-man', 'Hanging Man', 'bearish', 25)
  }
  if (hasBody && longUpper && smallLower) {
    if (trend === 'up') add('shooting-star', 'Shooting Star', 'bearish', 30)
    else if (trend === 'down') add('inverted-hammer', 'Inverted Hammer', 'bullish', 25)
  }

  // ---------- Two-candle patterns ----------
  if (!mp.bullish && mc.bullish && c.open <= p.close && c.close >= p.open && mc.body > mp.body) {
    add('bullish-engulfing', 'Bullish Engulfing', 'bullish', 40)
  }
  if (mp.bullish && !mc.bullish && c.open >= p.close && c.close <= p.open && mc.body > mp.body) {
    add('bearish-engulfing', 'Bearish Engulfing', 'bearish', 40)
  }
  if (!mp.bullish && mc.bullish && c.open < p.close && c.close > mp.midpoint && c.close < p.open) {
    add('piercing-line', 'Piercing Line', 'bullish', 30)
  }
  if (mp.bullish && !mc.bullish && c.open > p.close && c.close < mp.midpoint && c.close > p.open) {
    add('dark-cloud-cover', 'Dark Cloud Cover', 'bearish', 30)
  }

  // ---------- Three-candle patterns ----------
  const isMorningStar =
    !mp2.bullish &&
    mp2.body > 0 &&
    mp.body <= mp2.body * 0.5 &&
    mc.bullish &&
    mc.body > mp2.body &&
    c.close > mp2.midpoint
  if (isMorningStar) add('morning-star', 'Morning Star', 'bullish', 40)

  const isEveningStar =
    mp2.bullish &&
    mp2.body > 0 &&
    mp.body <= mp2.body * 0.5 &&
    !mc.bullish &&
    mc.body > mp2.body &&
    c.close < mp2.midpoint
  if (isEveningStar) add('evening-star', 'Evening Star', 'bearish', 40)

  const strongBodies = (a: Metrics, b: Metrics, d: Metrics) =>
    a.body > a.range * 0.5 && b.body > b.range * 0.5 && d.body > d.range * 0.5
  const rising = p2.close < p.close && p.close < c.close
  const falling = p2.close > p.close && p.close > c.close

  if (mp2.bullish && mp.bullish && mc.bullish && rising && strongBodies(mp2, mp, mc)) {
    add('three-white-soldiers', 'Three White Soldiers', 'bullish', 35)
  }
  if (!mp2.bullish && !mp.bullish && !mc.bullish && falling && strongBodies(mp2, mp, mc)) {
    add('three-black-crows', 'Three Black Crows', 'bearish', 35)
  }

  const raw = found.reduce(
    (sum, pattern) =>
      sum + (pattern.direction === 'bullish' ? pattern.strength : pattern.direction === 'bearish' ? -pattern.strength : 0),
    0,
  )

  return {
    patterns: found,
    score: round(clamp(raw), 1),
    detail:
      found.length === 0
        ? 'No clear candlestick pattern'
        : found.map((f) => f.label).join(' · '),
  }
}
