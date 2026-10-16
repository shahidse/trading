import { describe, expect, it } from 'vitest'
import { patterns } from '@/lib/indicators'
import { candlesFrom, candle } from './helpers'

describe('candlestick patterns', () => {
  it('returns null without enough candles', () => {
    expect(patterns([candle(1, 2, 0.5, 1.5)])).toBeNull()
  })

  it('detects a bullish engulfing after a decline', () => {
    const candles = candlesFrom([
      { open: 101, high: 102, low: 100, close: 101.5 },
      { open: 101.5, high: 101.8, low: 99, close: 99.5 },
      { open: 99.5, high: 100, low: 96.5, close: 97 },
      { open: 97, high: 97.2, low: 94.5, close: 95 },
      { open: 94, high: 100, low: 93.5, close: 99 },
    ])

    const result = patterns(candles)
    expect(result).not.toBeNull()
    expect(result!.patterns.map((p) => p.kind)).toContain('bullish-engulfing')
    expect(result!.score).toBeGreaterThan(0)
  })

  it('detects a bearish engulfing after a rally', () => {
    const candles = candlesFrom([
      { open: 99, high: 100, low: 98.5, close: 99.5 },
      { open: 99.5, high: 101, low: 99.3, close: 100.8 },
      { open: 100.8, high: 102, low: 100.5, close: 101.8 },
      { open: 101.8, high: 102.2, low: 101, close: 102 },
      { open: 103, high: 103.2, low: 99, close: 99.5 },
    ])

    const result = patterns(candles)
    expect(result).not.toBeNull()
    expect(result!.patterns.map((p) => p.kind)).toContain('bearish-engulfing')
    expect(result!.score).toBeLessThan(0)
  })

  it('detects a hammer at the bottom of a decline', () => {
    const candles = candlesFrom([
      { open: 105, high: 106, low: 104, close: 105 },
      { open: 105, high: 105.2, low: 103, close: 103.2 },
      { open: 103.2, high: 103.4, low: 101, close: 101.2 },
      { open: 101.2, high: 101.4, low: 99, close: 99.5 },
      { open: 99.5, high: 100.2, low: 95, close: 100 },
    ])

    const result = patterns(candles)
    expect(result).not.toBeNull()
    expect(result!.patterns.map((p) => p.kind)).toContain('hammer')
    expect(result!.score).toBeGreaterThan(0)
  })

  it('detects three white soldiers', () => {
    const candles = candlesFrom([
      { open: 99, high: 100, low: 98, close: 99 },
      { open: 99, high: 100, low: 98, close: 99.5 },
      { open: 99.5, high: 101.5, low: 99.2, close: 101.2 },
      { open: 101.2, high: 103.5, low: 101, close: 103.2 },
      { open: 103.2, high: 105.5, low: 103, close: 105.2 },
    ])

    const result = patterns(candles)
    expect(result).not.toBeNull()
    expect(result!.patterns.map((p) => p.kind)).toContain('three-white-soldiers')
    expect(result!.score).toBeGreaterThan(0)
  })

  it('reports no pattern on featureless candles', () => {
    const candles = candlesFrom(
      Array.from({ length: 6 }, () => ({
        open: 100,
        high: 101,
        low: 99,
        close: 100.4,
      })),
    )

    const result = patterns(candles)
    expect(result).not.toBeNull()
    expect(result!.patterns).toHaveLength(0)
    expect(result!.score).toBe(0)
  })

  it('keeps the score inside the allowed range', () => {
    const candles = candlesFrom([
      { open: 101, high: 102, low: 100, close: 101.5 },
      { open: 101.5, high: 101.8, low: 99, close: 99.5 },
      { open: 99.5, high: 100, low: 96.5, close: 97 },
      { open: 97, high: 97.2, low: 94.5, close: 95 },
      { open: 94, high: 100, low: 93.5, close: 99 },
    ])

    const result = patterns(candles)
    expect(result!.score).toBeGreaterThanOrEqual(-100)
    expect(result!.score).toBeLessThanOrEqual(100)
  })
})
