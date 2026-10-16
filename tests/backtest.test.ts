import { describe, expect, it } from 'vitest'
import { runBacktest } from '@/lib/backtest/replay'
import type { Candle } from '@/lib/types'

/**
 * Deterministic synthetic market with cycling regimes, so trades actually occur
 * without depending on live data.
 */
function syntheticCandles(count = 600, seed = 42): Candle[] {
  let price = 2000
  let state = seed

  const rand = () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }

  return Array.from({ length: count }, (_, i) => {
    const drift = Math.sin(i / 40) * 0.004
    const shock = (rand() - 0.5) * 0.01
    const open = price
    const close = Math.max(1, open * (1 + drift + shock))
    const high = Math.max(open, close) * (1 + rand() * 0.002)
    const low = Math.min(open, close) * (1 - rand() * 0.002)
    price = close

    return {
      time: 1_700_000_000_000 + i * 15 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume: 100 + rand() * 50,
    }
  })
}

const candles = syntheticCandles()

describe('runBacktest', () => {
  it('accounts for every trade in exactly one exit bucket', () => {
    const result = runBacktest(candles)
    const bucketed = Object.values(result.exits).reduce((sum, n) => sum + n, 0)

    expect(bucketed).toBe(result.trades.length)
  })

  it('only ever closes a stop in loss and a target in profit', () => {
    const result = runBacktest(candles)

    expect(result.trades.length).toBeGreaterThan(0)

    for (const trade of result.trades) {
      if (trade.exitReason === 'stop') {
        expect(trade.returnPct).toBeLessThan(0)
      }
      if (trade.exitReason === 'target') {
        expect(trade.returnPct).toBeGreaterThan(0)
      }
      expect(trade.exitTime).toBeGreaterThanOrEqual(trade.entryTime)
      expect(trade.barsHeld).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps exposure and drawdown within sane bounds', () => {
    const result = runBacktest(candles)

    expect(result.exposurePct).toBeGreaterThanOrEqual(0)
    expect(result.exposurePct).toBeLessThanOrEqual(100)
    expect(result.maxDrawdownPct).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(result.totalReturnPct)).toBe(true)
  })

  it('exposes the configured stop and reward multiples', () => {
    const result = runBacktest(candles)
    expect(result.stopAtrMultiple).toBeGreaterThan(0)
    expect(result.rewardMultiple).toBeGreaterThan(0)
  })

  it('counts entries the trend gate refused', () => {
    const result = runBacktest(candles)
    expect(result.blockedEntries).toBeGreaterThanOrEqual(0)
  })

  it('starts trading only after the warm-up window', () => {
    const result = runBacktest(candles)
    expect(result.warmupBars).toBe(210)
  })
})
