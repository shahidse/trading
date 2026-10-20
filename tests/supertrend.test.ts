import { describe, expect, it } from 'vitest'
import { supertrend } from '@/lib/indicators/supertrend'
import { supertrendSeries } from '@/lib/indicators/series'
import type { Candle } from '@/lib/types'
import { candlesFromCloses } from './helpers'

function createCandles(
  closes: number[],
  highOffset = 2,
  lowOffset = 2,
): Candle[] {
  return closes.map((close, i) => ({
    time: 1_700_000_000_000 + i * 15 * 60 * 1000,
    open: close,
    high: close + highOffset,
    low: Math.max(1, close - lowOffset),
    close,
    volume: 100,
  }))
}

describe('supertrend indicator', () => {
  it('returns null without enough candles', () => {
    expect(supertrend(candlesFromCloses([100, 101, 102]))).toBeNull()
  })

  it('identifies an uptrend with price above SuperTrend support', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 2000 + i * 15)
    const candles = createCandles(closes)
    const result = supertrend(candles, { period: 10, multiplier: 3 })

    expect(result).not.toBeNull()
    expect(result!.direction).toBe('bullish')
    expect(result!.value).toBeLessThan(closes[closes.length - 1])
    expect(result!.distancePct).toBeGreaterThan(0)
    expect(result!.score).toBeGreaterThan(0)
  })

  it('identifies a downtrend with price below SuperTrend resistance', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 2500 - i * 15)
    const candles = createCandles(closes)
    const result = supertrend(candles, { period: 10, multiplier: 3 })

    expect(result).not.toBeNull()
    expect(result!.direction).toBe('bearish')
    expect(result!.value).toBeGreaterThan(closes[closes.length - 1])
    expect(result!.distancePct).toBeLessThan(0)
    expect(result!.score).toBeLessThan(0)
  })

  it('detects a fresh bullish flip and applies momentum bonus', () => {
    // 30 candles downtrend, then sharp upward breakout on the latest bar to force a bullish flip
    const downCloses = Array.from({ length: 30 }, (_, i) => 2000 - i * 10)
    const flipCloses = [...downCloses, 1850]
    const candles = createCandles(flipCloses)
    const result = supertrend(candles, { period: 10, multiplier: 2 })

    expect(result).not.toBeNull()
    expect(result!.direction).toBe('bullish')
    expect(result!.flipped).toBe(true)
    expect(result!.flipDirection).toBe('bullish')
    expect(result!.barsSinceFlip).toBe(0)
    expect(result!.score).toBeGreaterThanOrEqual(80)
  })

  it('keeps scores bounded in [-100, 100]', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 2000 + Math.sin(i / 2) * 100)
    const result = supertrend(createCandles(closes))

    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThanOrEqual(-100)
    expect(result!.score).toBeLessThanOrEqual(100)
  })

  it('produces time-aligned series via supertrendSeries', () => {
    const closes = Array.from({ length: 35 }, (_, i) => 2000 + i * 5)
    const candles = createCandles(closes)
    const series = supertrendSeries(candles, { period: 10, multiplier: 3 })

    expect(series.length).toBeGreaterThan(0)
    expect(series[series.length - 1].time).toBe(candles[candles.length - 1].time)
    expect(Number.isFinite(series[series.length - 1].value)).toBe(true)
  })
})
