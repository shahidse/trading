import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { computeIndicators, type IndicatorBundle } from '@/lib/indicators'
import { scoreIndicators } from '@/lib/signal/scoring'
import { decideDirection, generateSignal } from '@/lib/signal/engine'
import { candlesFromCloses } from './helpers'

const emptyBundle: IndicatorBundle = {
  ichimoku: null,
  macd: null,
  emaTrend: null,
  supertrend: null,
  bollinger: null,
  rsi: null,
  stochRsi: null,
  vwap: null,
  volume: null,
  patterns: null,
  adx: null,
  atr: null,
}

describe('decideDirection', () => {
  it('maps scores onto directions using the configured thresholds', () => {
    const { long, short } = config.thresholds

    expect(decideDirection(long)).toBe('LONG')
    expect(decideDirection(long + 25)).toBe('LONG')
    expect(decideDirection(long - 0.1)).toBe('NEUTRAL')
    expect(decideDirection(0)).toBe('NEUTRAL')
    expect(decideDirection(short + 0.1)).toBe('NEUTRAL')
    expect(decideDirection(short)).toBe('SHORT')
    expect(decideDirection(short - 25)).toBe('SHORT')
  })
})

describe('scoreIndicators', () => {
  it('renormalises weights across available indicators', () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 + i * 0.4)
    const { indicators, composite, confluence } = scoreIndicators(
      computeIndicators(candlesFromCloses(closes)),
    )

    expect(indicators.length).toBeGreaterThan(0)
    const totalWeight = indicators.reduce((sum, i) => sum + i.weight, 0)
    expect(totalWeight).toBeCloseTo(1, 3)

    const totalContribution = indicators.reduce((sum, i) => sum + i.contribution, 0)
    // The composite is the weighted sum scaled by the confluence multiplier.
    // Contributions, the multiplier and the composite are each rounded
    // independently, so allow a small gap rather than exact equality.
    expect(Math.abs(totalContribution * confluence.multiplier - composite)).toBeLessThan(0.2)
  })

  it('tilts trend weights up and mean-reversion down in a trending regime', () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 + i * 0.6)
    const { indicators, regime } = scoreIndicators(computeIndicators(candlesFromCloses(closes)))

    expect(regime.regime).toBe('trending')

    const trend = indicators.filter((i) => i.group === 'trend')
    const meanReversion = indicators.filter((i) => i.group === 'mean-reversion')

    expect(trend.length).toBeGreaterThan(0)
    expect(meanReversion.length).toBeGreaterThan(0)
    for (const entry of trend) expect(entry.weight).toBeGreaterThan(entry.baseWeight)
    for (const entry of meanReversion) expect(entry.weight).toBeLessThan(entry.baseWeight)
  })

  it('returns a neutral result when every indicator is missing', () => {
    const { composite, indicators, confluence } = scoreIndicators(emptyBundle)

    expect(composite).toBe(0)
    expect(indicators).toHaveLength(0)
    expect(confluence.bullish).toBe(0)
    expect(confluence.bearish).toBe(0)
  })
})

describe('generateSignal', () => {
  it('produces a complete signal from a candle series', () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 + i * 0.5)
    const signal = generateSignal(candlesFromCloses(closes))

    expect(signal.direction === 'LONG' || signal.direction === 'SHORT' || signal.direction === 'NEUTRAL').toBe(true)
    expect(signal.score).toBeGreaterThanOrEqual(-100)
    expect(signal.score).toBeLessThanOrEqual(100)
    expect(signal.confidence).toBeCloseTo(Math.abs(signal.score), 1)
    // All 10 directional indicators, given enough history for EMA200.
    expect(signal.indicators).toHaveLength(10)
    expect(signal.reasons.length).toBeGreaterThan(0)
    expect(signal.price).toBeGreaterThan(0)
    expect(signal.timeframe).toBe('15m')
    expect(signal.regime.thresholdMultiplier).toBeGreaterThan(0)
    expect(signal.thresholdsUsed.long).toBeGreaterThan(0)
    expect(signal.confluence.verdict).toBeTruthy()
  })

  it('carries the chainlink context through', () => {
    const closes = Array.from({ length: 150 }, (_, i) => 100 + Math.sin(i / 6) * 5)
    const signal = generateSignal(candlesFromCloses(closes), {
      chainlinkPrice: 123.45,
      divergencePct: 0.12,
      price: 123.6,
    })

    expect(signal.chainlinkPrice).toBe(123.45)
    expect(signal.divergencePct).toBe(0.12)
    expect(signal.price).toBe(123.6)
  })

  it('is a pure function — identical input yields identical output', () => {
    const closes = Array.from({ length: 150 }, (_, i) => 100 + Math.cos(i / 4) * 6)
    const candles = candlesFromCloses(closes)
    const timestamp = 1_700_000_000_000

    const first = generateSignal(candles, { timestamp })
    const second = generateSignal(candles, { timestamp })

    expect(second.score).toBe(first.score)
    expect(second.direction).toBe(first.direction)
  })
})
