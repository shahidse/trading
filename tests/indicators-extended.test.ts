import { describe, expect, it } from 'vitest'
import { adx, atr, emaTrend, macd, stochRsi, volume, vwap } from '@/lib/indicators'
import { candlesFromCloses } from './helpers'

/** Exponential growth makes MACD/EMA behaviour unambiguous. */
function growthSeries(length: number, rate = 1.01): number[] {
  return Array.from({ length }, (_, i) => 100 * Math.pow(rate, i))
}

describe('macd', () => {
  it('returns null without enough candles', () => {
    expect(macd(candlesFromCloses([1, 2, 3]))).toBeNull()
  })

  it('scores an accelerating rally as bullish', () => {
    const result = macd(candlesFromCloses(growthSeries(120)))
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThan(0)
    expect(result!.zeroLine).toBe('above')
  })

  it('scores an accelerating sell-off as bearish', () => {
    // Quadratic decline: the fall speeds up, so MACD momentum deteriorates.
    const closes = Array.from({ length: 120 }, (_, i) => 200 - 0.01 * i * i)
    const result = macd(candlesFromCloses(closes))
    expect(result).not.toBeNull()
    expect(result!.score).toBeLessThan(0)
    expect(result!.zeroLine).toBe('below')
  })

  it('keeps the score inside the allowed range', () => {
    const closes = Array.from({ length: 150 }, (_, i) => 100 + Math.sin(i / 4) * 8)
    const result = macd(candlesFromCloses(closes))!
    expect(result.score).toBeGreaterThanOrEqual(-100)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})

describe('emaTrend', () => {
  it('returns null before EMA200 has enough history', () => {
    expect(emaTrend(candlesFromCloses(Array.from({ length: 150 }, (_, i) => 100 + i)))).toBeNull()
  })

  it('reads a strong uptrend as a bullish stack', () => {
    const result = emaTrend(candlesFromCloses(growthSeries(260)))
    expect(result).not.toBeNull()
    expect(result!.alignment).toBe('bullish')
    expect(result!.score).toBeGreaterThan(0)
  })

  it('reads a strong downtrend as a bearish stack', () => {
    const result = emaTrend(candlesFromCloses(growthSeries(260, 0.99)))
    expect(result).not.toBeNull()
    expect(result!.alignment).toBe('bearish')
    expect(result!.score).toBeLessThan(0)
  })
})

describe('stochRsi', () => {
  it('returns null without enough candles', () => {
    expect(stochRsi(candlesFromCloses([1, 2, 3]))).toBeNull()
  })

  it('flags a pullback-and-drop as oversold (bullish)', () => {
    const closes = [
      ...Array.from({ length: 100 }, (_, i) => 150 + i * 0.5),
      ...Array.from({ length: 15 }, (_, i) => 199.5 - (i + 1) * 4),
    ]
    const result = stochRsi(candlesFromCloses(closes))
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThan(0)
  })

  it('flags a bounce-after-decline as overbought (bearish)', () => {
    const closes = [
      ...Array.from({ length: 100 }, (_, i) => 200 - i * 0.5),
      ...Array.from({ length: 15 }, (_, i) => 150.5 + (i + 1) * 4),
    ]
    const result = stochRsi(candlesFromCloses(closes))
    expect(result).not.toBeNull()
    expect(result!.score).toBeLessThan(0)
  })

  it('returns no signal on a perfectly monotonic run (degenerate RSI range)', () => {
    const result = stochRsi(candlesFromCloses(Array.from({ length: 120 }, (_, i) => 100 + i)))
    expect(result).not.toBeNull()
    expect(result!.score).toBe(0)
  })

  it('keeps the score inside the allowed range', () => {
    const closes = Array.from({ length: 150 }, (_, i) => 100 + Math.cos(i / 3) * 7)
    const result = stochRsi(candlesFromCloses(closes))!
    expect(result.score).toBeGreaterThanOrEqual(-100)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})

describe('volume', () => {
  it('returns null without enough candles', () => {
    expect(volume(candlesFromCloses([1, 2, 3]))).toBeNull()
  })

  it('confirms an advance when price and OBV rise together', () => {
    const candles = candlesFromCloses(Array.from({ length: 40 }, (_, i) => 100 + i)).map(
      (c, i) => ({ ...c, volume: 100 + i }),
    )
    const result = volume(candles)

    expect(result).not.toBeNull()
    expect(result!.divergence).toBeNull()
    expect(result!.score).toBeGreaterThan(0)
  })

  it('flags a bearish divergence when price rises but OBV falls', () => {
    const closes: number[] = []
    const volumes: number[] = []

    for (let i = 0; i < 20; i++) {
      closes.push(100 + i * 0.1)
      volumes.push(10)
    }
    for (let i = 0; i < 11; i++) {
      closes.push(101.9 + i * 0.1)
      volumes.push(10)
    }
    // Three heavy-volume down bars drag OBV down, then price recovers above
    // where it started the lookback window.
    closes.push(100.9)
    volumes.push(5000)
    closes.push(98.9)
    volumes.push(5000)
    closes.push(96.9)
    volumes.push(5000)
    for (let i = 1; i <= 6; i++) {
      closes.push(96.9 + i * 1.5)
      volumes.push(10)
    }

    const candles = candlesFromCloses(closes).map((c, i) => ({ ...c, volume: volumes[i] }))
    const result = volume(candles)

    expect(result).not.toBeNull()
    expect(result!.divergence).toBe('bearish')
    expect(result!.score).toBeLessThan(0)
  })
})

describe('vwap', () => {
  it('returns null without enough candles', () => {
    expect(vwap(candlesFromCloses([100, 101, 102]))).toBeNull()
  })

  it('treats price below VWAP as discounted (bullish)', () => {
    const closes = [...Array(60).fill(100), 95]
    const result = vwap(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.deviationPct).toBeLessThan(0)
    expect(result!.score).toBeGreaterThan(0)
  })

  it('treats price above VWAP as stretched (bearish)', () => {
    const closes = [...Array(60).fill(100), 106]
    const result = vwap(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.deviationPct).toBeGreaterThan(0)
    expect(result!.score).toBeLessThan(0)
  })
})

describe('adx (regime, not direction)', () => {
  it('returns null without enough candles for three smoothing passes', () => {
    expect(adx(candlesFromCloses(Array.from({ length: 20 }, (_, i) => 100 + i)))).toBeNull()
  })

  it('classifies a strong linear trend as trending', () => {
    const result = adx(candlesFromCloses(Array.from({ length: 120 }, (_, i) => 100 + i * 0.8)))

    expect(result).not.toBeNull()
    expect(result!.regime).toBe('trending')
    expect(result!.direction).toBe('bullish')
  })
})

describe('atr (adaptive threshold)', () => {
  it('returns null without enough candles', () => {
    expect(atr(candlesFromCloses(Array.from({ length: 20 }, (_, i) => 100 + i)))).toBeNull()
  })

  it('clamps the threshold multiplier to the configured bounds', () => {
    const closes = Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 5) * 3)
    const result = atr(candlesFromCloses(closes))

    expect(result).not.toBeNull()
    expect(result!.thresholdMultiplier).toBeGreaterThanOrEqual(0.8)
    expect(result!.thresholdMultiplier).toBeLessThanOrEqual(1.4)
  })

  it('produces a multiplier of exactly 1 when adaptive mode is off', () => {
    const closes = Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 5) * 3)
    const result = atr(candlesFromCloses(closes), { adaptive: false })

    expect(result!.thresholdMultiplier).toBe(1)
  })
})
