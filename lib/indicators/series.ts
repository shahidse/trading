/**
 * Series-producing indicator helpers for the price chart.
 *
 * The indicator modules in this folder return only the **latest** bar's value
 * (that is all the signal engine needs). A TradingView-style chart needs the
 * whole history, so these helpers re-run the same maths over every bar and
 * return time-aligned points ready for `lightweight-charts`.
 *
 * Formulas and parameters are taken from `lib/config.ts`, so the chart can
 * never drift from the signal engine's indicator settings.
 */
import { BollingerBands, EMA, MACD, RSI } from 'technicalindicators'
import { config } from '@/lib/config'
import type { Candle } from '@/lib/types'

/** A single plotted point. `time` is the candle open time in Unix milliseconds. */
export type LinePoint = { time: number; value: number }

/**
 * Align a (shorter) indicator output to the candle tail.
 *
 * Indicator libraries return `candles.length - warmup` values, where the last
 * value belongs to the most recent candle. Mapping from the tail keeps every
 * plotted point on the correct bar.
 */
function alignTail(candles: Candle[], values: number[]): LinePoint[] {
  if (values.length === 0) return []
  const offset = Math.max(0, candles.length - values.length)
  const out: LinePoint[] = []

  for (let i = 0; i < values.length; i++) {
    const candle = candles[offset + i]
    const value = values[i]
    if (!candle || !Number.isFinite(value)) continue
    out.push({ time: candle.time, value })
  }

  return out
}

/** Bollinger Bands (20, 2σ) as three lines. */
export function bollingerSeries(
  candles: Candle[],
  period = config.bollinger.period,
  stdDev = config.bollinger.stdDev,
): { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] } {
  const closes = candles.map((c) => c.close)
  if (closes.length < period) return { upper: [], middle: [], lower: [] }

  const series = BollingerBands.calculate({ period, stdDev, values: closes })

  return {
    upper: alignTail(candles, series.map((s) => s.upper)),
    middle: alignTail(candles, series.map((s) => s.middle)),
    lower: alignTail(candles, series.map((s) => s.lower)),
  }
}

/** EMA trend lines (20 / 50 / 200). */
export function emaSeries(
  candles: Candle[],
  periods = config.emaTrend,
): { fast: LinePoint[]; mid: LinePoint[]; slow: LinePoint[] } {
  const closes = candles.map((c) => c.close)

  const calc = (period: number): LinePoint[] => {
    if (closes.length < period) return []
    return alignTail(candles, EMA.calculate({ period, values: closes }))
  }

  return {
    fast: calc(periods.fast),
    mid: calc(periods.mid),
    slow: calc(periods.slow),
  }
}

/**
 * Rolling VWAP (default 96 × 15m = 24h).
 *
 * Mirrors `vwap.ts`: a rolling window rather than a cumulative average so the
 * line keeps responding to recent volume.
 */
export function vwapSeries(candles: Candle[], opts = config.vwap): LinePoint[] {
  if (candles.length < 20) return []

  const window = Math.min(opts.window, candles.length)
  const out: LinePoint[] = []

  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(0, i - window + 1)
    let priceVolume = 0
    let totalVolume = 0

    for (let j = start; j <= i; j++) {
      const c = candles[j]
      priceVolume += ((c.high + c.low + c.close) / 3) * c.volume
      totalVolume += c.volume
    }

    if (totalVolume > 0) out.push({ time: candles[i].time, value: priceVolume / totalVolume })
  }

  return out
}

/** Midpoint of the highest high / lowest low over `period` bars ending at `index`. */
function donchianMidpoint(candles: Candle[], index: number, period: number): number {
  const start = Math.max(0, index - period + 1)
  let high = -Infinity
  let low = Infinity

  for (let j = start; j <= index; j++) {
    if (candles[j].high > high) high = candles[j].high
    if (candles[j].low < low) low = candles[j].low
  }

  return (high + low) / 2
}

/**
 * Ichimoku Cloud (9 / 26 / 52, displacement 26).
 *
 * The leading spans (Senkou A/B) are projected `displacement` bars **forward**,
 * exactly as they are drawn on a TradingView chart, so the cloud sits ahead of
 * price. The formulas match `ichimoku.ts`; the scalar version reads only the
 * latest bar.
 */
export function ichimokuSeries(
  candles: Candle[],
  opts = config.ichimoku,
): { conversion: LinePoint[]; base: LinePoint[]; spanA: LinePoint[]; spanB: LinePoint[] } {
  const { conversionPeriod, basePeriod, spanPeriod, displacement } = opts
  const conversion: LinePoint[] = []
  const base: LinePoint[] = []
  const spanA: LinePoint[] = []
  const spanB: LinePoint[] = []

  for (let i = 0; i < candles.length; i++) {
    const tenkan = i >= conversionPeriod - 1 ? donchianMidpoint(candles, i, conversionPeriod) : null
    const kijun = i >= basePeriod - 1 ? donchianMidpoint(candles, i, basePeriod) : null
    const senkouB = i >= spanPeriod - 1 ? donchianMidpoint(candles, i, spanPeriod) : null

    if (tenkan != null) conversion.push({ time: candles[i].time, value: tenkan })
    if (kijun != null) base.push({ time: candles[i].time, value: kijun })

    const forward = i + displacement
    if (forward < candles.length) {
      if (tenkan != null && kijun != null) {
        spanA.push({ time: candles[forward].time, value: (tenkan + kijun) / 2 })
      }
      if (senkouB != null) {
        spanB.push({ time: candles[forward].time, value: senkouB })
      }
    }
  }

  return { conversion, base, spanA, spanB }
}

/** RSI (14) as a single line. */
export function rsiSeries(candles: Candle[], period = config.rsi.period): LinePoint[] {
  const closes = candles.map((c) => c.close)
  if (closes.length < period + 1) return []
  return alignTail(candles, RSI.calculate({ period, values: closes }))
}

/** MACD (12 / 26 / 9) as line + signal + histogram. */
export function macdSeries(
  candles: Candle[],
  opts = config.macd,
): { macd: LinePoint[]; signal: LinePoint[]; histogram: LinePoint[] } {
  const closes = candles.map((c) => c.close)
  const minBars = opts.slowPeriod + opts.signalPeriod
  if (closes.length < minBars) return { macd: [], signal: [], histogram: [] }

  const raw = MACD.calculate({
    values: closes,
    fastPeriod: opts.fastPeriod,
    slowPeriod: opts.slowPeriod,
    signalPeriod: opts.signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  }).filter(
    (r) =>
      typeof r.MACD === 'number' &&
      typeof r.signal === 'number' &&
      typeof r.histogram === 'number',
  )

  return {
    macd: alignTail(
      candles,
      raw.map((r) => r.MACD as number),
    ),
    signal: alignTail(
      candles,
      raw.map((r) => r.signal as number),
    ),
    histogram: alignTail(
      candles,
      raw.map((r) => r.histogram as number),
    ),
  }
}

/**
 * SuperTrend (10, 3) trailing stop / support-resistance line.
 *
 * Trailing price level plotted on every bar where SuperTrend is defined.
 */
export function supertrendSeries(candles: Candle[], opts = config.supertrend): LinePoint[] {
  const period = opts.period ?? 10
  const multiplier = opts.multiplier ?? 3
  const len = candles.length
  if (len < period + 1) return []

  const tr: number[] = new Array(len)
  tr[0] = candles[0].high - candles[0].low
  for (let i = 1; i < len; i++) {
    const hl = candles[i].high - candles[i].low
    const hc = Math.abs(candles[i].high - candles[i - 1].close)
    const lc = Math.abs(candles[i].low - candles[i - 1].close)
    tr[i] = Math.max(hl, hc, lc)
  }

  const atrValues: number[] = new Array(len)
  let sumTr = 0
  for (let i = 0; i < period; i++) sumTr += tr[i]
  atrValues[period - 1] = sumTr / period
  for (let i = period; i < len; i++) {
    atrValues[i] = (atrValues[i - 1] * (period - 1) + tr[i]) / period
  }

  const upperBand: number[] = new Array(len)
  const lowerBand: number[] = new Array(len)
  const st: number[] = new Array(len)
  const dir: ('bullish' | 'bearish')[] = new Array(len)
  const out: LinePoint[] = []

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
    } else {
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

    out.push({ time: candles[i].time, value: Number(st[i].toFixed(2)) })
  }

  return out
}

/** Every overlay series the chart can render, in one pass. */
export function computeChartSeries(candles: Candle[]) {
  return {
    candles,
    bollinger: bollingerSeries(candles),
    ema: emaSeries(candles),
    vwap: vwapSeries(candles),
    ichimoku: ichimokuSeries(candles),
    rsi: rsiSeries(candles),
    macd: macdSeries(candles),
    supertrend: supertrendSeries(candles),
  }
}

export type ChartSeriesBundle = ReturnType<typeof computeChartSeries>
