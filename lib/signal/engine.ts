import { config } from '@/lib/config'
import { computeIndicators } from '@/lib/indicators'
import { emaTrend } from '@/lib/indicators/ema-trend'
import { supertrend } from '@/lib/indicators/supertrend'
import type { Candle, MacroTrendInfo, RegimeInfo, Signal, SignalDirection } from '@/lib/types'
import { round } from '@/lib/utils'
import { buildTradePlan, trendRead } from './plan'
import { scoreIndicators } from './scoring'

export type SignalContext = {
  symbol?: string
  timeframe?: string
  /** Overrides the last candle close (e.g. a live ticker price). */
  price?: number
  chainlinkPrice?: number | null
  divergencePct?: number | null
  timestamp?: number
  reversalScalpMode?: boolean
  macroCandles?: Candle[]
}

/** Compute higher timeframe (1h) macro trend filter. */
export function computeMacroTrend(
  macroCandles: Candle[] | undefined,
  currentDirection: SignalDirection,
): MacroTrendInfo | undefined {
  if (!macroCandles || macroCandles.length < 25) return undefined

  const st = supertrend(macroCandles, { period: 10, multiplier: 3 })
  const ema = emaTrend(macroCandles, { fast: 20, mid: 50, slow: 200 })

  let up = 0
  let down = 0
  const evidence: string[] = []

  if (st) {
    if (st.direction === 'bullish') {
      up++
      evidence.push(`1h SuperTrend bullish ($${st.value})`)
    } else {
      down++
      evidence.push(`1h SuperTrend bearish ($${st.value})`)
    }
  }

  if (ema) {
    if (ema.alignment === 'bullish') {
      up++
      evidence.push('1h EMAs stacked bullish')
    } else if (ema.alignment === 'bearish') {
      down++
      evidence.push('1h EMAs stacked bearish')
    }
  }

  const verdict: MacroTrendInfo['verdict'] = up > down ? 'bullish' : down > up ? 'bearish' : 'neutral'
  let alignmentWithSignal: MacroTrendInfo['alignmentWithSignal'] = 'neutral'

  if (currentDirection === 'LONG') {
    alignmentWithSignal = verdict === 'bullish' ? 'aligned' : verdict === 'bearish' ? 'counter-trend' : 'neutral'
  } else if (currentDirection === 'SHORT') {
    alignmentWithSignal = verdict === 'bearish' ? 'aligned' : verdict === 'bullish' ? 'counter-trend' : 'neutral'
  }

  const detail = evidence.length > 0 ? evidence.join(' · ') : '1h macro trend neutral'

  return {
    timeframe: '1h',
    verdict,
    supertrendDirection: st?.direction ?? null,
    supertrendValue: st?.value ?? null,
    emaAlignment: ema?.alignment ?? null,
    alignmentWithSignal,
    detail,
  }
}

/** Thresholds scaled by the ATR volatility multiplier. */
export function effectiveThresholds(regime: RegimeInfo): { long: number; short: number } {
  return {
    long: round(config.thresholds.long * regime.thresholdMultiplier, 1),
    short: round(config.thresholds.short * regime.thresholdMultiplier, 1),
  }
}

/** Map a composite score onto a direction using the given thresholds. */
export function decideDirection(
  score: number,
  thresholds: { long: number; short: number } = config.thresholds,
): SignalDirection {
  if (score >= thresholds.long) return 'LONG'
  if (score <= thresholds.short) return 'SHORT'
  return 'NEUTRAL'
}

/**
 * Run the full pipeline over a candle series and produce one `Signal`.
 *
 * Pure function — no I/O — which is what lets the backtester reuse the exact
 * same logic that runs live.
 */
export function generateSignal(candles: Candle[], ctx: SignalContext = {}): Signal {
  const bundle = computeIndicators(candles)
  const { composite, indicators, regime, confluence, reasons } = scoreIndicators(bundle)

  const last = candles[candles.length - 1]
  const price = ctx.price ?? last?.close ?? 0

  // ATR makes the bar for a signal higher when volatility is elevated.
  const thresholdsUsed = effectiveThresholds(regime)
  const direction = decideDirection(composite, thresholdsUsed)

  // 1h Macro Trend Filter
  const macroTrend = computeMacroTrend(ctx.macroCandles, direction)

  // Concrete, actionable levels — including the trend gate that refuses to buy
  // into a confirmed downtrend, and the Reversal Scalper for bullish candle bounces.
  const plan = buildTradePlan({
    direction,
    price,
    score: composite,
    regime,
    confluence,
    trend: trendRead(bundle),
    patternScore: bundle.patterns?.score,
    patternNames: bundle.patterns?.patterns.map((p) => p.label) ?? [],
    rsiValue: bundle.rsi?.value ?? null,
    supertrend: bundle.supertrend,
    macroTrend,
    reversalScalpMode: ctx.reversalScalpMode ?? config.exchange.reversalScalpMode,
  })

  const summary: string[] = []
  if (direction === 'LONG') {
    summary.push(`Bullish setup — composite ${composite} ≥ ${thresholdsUsed.long}`)
  } else if (direction === 'SHORT') {
    summary.push(`Bearish setup — composite ${composite} ≤ ${thresholdsUsed.short}`)
  } else {
    summary.push(
      `No edge — composite ${composite} inside ${thresholdsUsed.short}…${thresholdsUsed.long}`,
    )
  }
  if (macroTrend) {
    summary.push(`Macro (1h): ${macroTrend.detail} (${macroTrend.alignmentWithSignal})`)
  }
  summary.push(...reasons)

  return {
    symbol: ctx.symbol ?? config.symbol,
    timeframe: ctx.timeframe ?? config.timeframe,
    direction,
    score: composite,
    confidence: round(Math.abs(composite), 1),
    price: round(price, 2),
    chainlinkPrice: ctx.chainlinkPrice ?? null,
    divergencePct: ctx.divergencePct ?? null,
    timestamp: ctx.timestamp ?? Date.now(),
    regime,
    confluence,
    thresholdsUsed,
    plan,
    indicators,
    macroTrend,
    reasons: summary,
  }
}

