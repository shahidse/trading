import { describe, expect, it } from 'vitest'
import { bollinger, ichimoku, rsi } from '@/lib/indicators'
import { candlesFromCloses } from './helpers'

describe('bollinger', () => {
  it('returns null without enough candles', () => {
    expect(bollinger(candlesFromCloses([1, 2, 3]), 20, 2)).toBeNull()
  })

  it('orders the bands upper > middle > lower', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 3) * 5)
    const result = bollinger(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.upper).toBeGreaterThan(result!.middle)
    expect(result!.middle).toBeGreaterThan(result!.lower)
  })

  it('treats a drop below the lower band as bullish (oversold)', () => {
    const closes = [...Array(30).fill(100), 80]
    const result = bollinger(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.percentB).toBeLessThan(0)
    expect(result!.score).toBeGreaterThan(0)
  })

  it('treats a spike above the upper band as bearish (overbought)', () => {
    const closes = [...Array(30).fill(100), 120]
    const result = bollinger(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.percentB).toBeGreaterThan(1)
    expect(result!.score).toBeLessThan(0)
  })

  it('keeps the score inside the allowed range', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + (i % 7) * 3 - 9)
    const result = bollinger(candlesFromCloses(closes))
    expect(result!.score).toBeGreaterThanOrEqual(-100)
    expect(result!.score).toBeLessThanOrEqual(100)
  })
})

describe('rsi', () => {
  it('returns null without enough candles', () => {
    expect(rsi(candlesFromCloses([1, 2, 3]))).toBeNull()
  })

  it('flags a relentless rally as overbought (bearish)', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + i)
    const result = rsi(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.value).toBeGreaterThan(70)
    expect(result!.score).toBeLessThan(0)
  })

  it('flags a relentless sell-off as oversold (bullish)', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 140 - i)
    const result = rsi(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.value).toBeLessThan(30)
    expect(result!.score).toBeGreaterThan(0)
  })

  it('keeps the score inside the allowed range', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.cos(i / 2) * 4)
    const result = rsi(candlesFromCloses(closes))
    expect(result!.score).toBeGreaterThanOrEqual(-100)
    expect(result!.score).toBeLessThanOrEqual(100)
  })
})

describe('ichimoku', () => {
  it('returns null without enough candles for the cloud', () => {
    expect(ichimoku(candlesFromCloses(Array(50).fill(100)))).toBeNull()
  })

  it('reads an uptrend as price above the cloud and bullish', () => {
    const closes = Array.from({ length: 150 }, (_, i) => 100 + i * 0.5)
    const result = ichimoku(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.priceVsCloud).toBe('above')
    expect(result!.tkRelation).toBe('bullish')
    expect(result!.score).toBeGreaterThan(0)
  })

  it('reads a downtrend as price below the cloud and bearish', () => {
    const closes = Array.from({ length: 150 }, (_, i) => 200 - i * 0.5)
    const result = ichimoku(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.priceVsCloud).toBe('below')
    expect(result!.tkRelation).toBe('bearish')
    expect(result!.score).toBeLessThan(0)
  })

  it('keeps the score inside the allowed range', () => {
    const closes = Array.from({ length: 150 }, (_, i) => 100 + Math.sin(i / 5) * 10)
    const result = ichimoku(candlesFromCloses(closes))
    expect(result!.score).toBeGreaterThanOrEqual(-100)
    expect(result!.score).toBeLessThanOrEqual(100)
  })
})
