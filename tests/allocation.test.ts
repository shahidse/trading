import { describe, expect, it } from 'vitest'
import {
  calculateMacroCryptoAllocation,
  calculateRiskBasedNotional,
  calculateStagedTargets,
  ETH_KEY_LEVELS,
} from '@/lib/exchange/allocation'

describe('Capital Allocation & Sizing Engine', () => {
  it('calculates position size based on 1.5% account risk', () => {
    // $10,000 account, entry 2500, stop 2375 (5% stop distance).
    // Risk = $150.
    // Raw notional = 150 / 0.05 = $3000.
    // With maxNotionalUsd cap set to $5000:
    const result = calculateRiskBasedNotional({
      accountEquityUsd: 10000,
      riskPercent: 1.5,
      entryPrice: 2500,
      stopLossPrice: 2375,
      maxNotionalUsd: 5000,
    })

    expect(result.riskUsd).toBe(150)
    expect(result.stopDistancePct).toBeCloseTo(0.05, 4)
    expect(result.notionalUsd).toBe(3000)
    expect(result.quantityEth).toBeCloseTo(1.2, 3)
    expect(result.capped).toBe(false)
  })

  it('respects hard maxNotionalUsd ceiling cap', () => {
    const result = calculateRiskBasedNotional({
      accountEquityUsd: 10000,
      riskPercent: 1.5,
      entryPrice: 2500,
      stopLossPrice: 2450, // 2% stop -> raw notional = $7500
      maxNotionalUsd: 500, // Hard ceiling
    })

    expect(result.notionalUsd).toBe(500)
    expect(result.capped).toBe(true)
  })

  it('refuses sizes below minimum exchange notional', () => {
    const result = calculateRiskBasedNotional({
      accountEquityUsd: 100,
      riskPercent: 1.0, // $1 risk
      entryPrice: 2500,
      stopLossPrice: 2000, // 20% stop -> $5 notional
      minNotionalUsd: 10,
    })

    expect(result.notionalUsd).toBe(0)
    expect(result.quantityEth).toBe(0)
  })

  it('calculates staged take-profit targets for 1:1.5 and 1:2.6 ratios', () => {
    // Entry 2500, Stop 2400 (stop distance 100 = 4%)
    // TP1 = 2500 + 1.5 * 100 = 2650 (+6%)
    // TP2 = 2500 + 2.6 * 100 = 2760 (+10.4%)
    const staged = calculateStagedTargets(2500, 2400, 1.5, 2.6)

    expect(staged.stopDistance).toBe(100)
    expect(staged.stopDistancePct).toBe(4)
    expect(staged.tp1).toBe(2650)
    expect(staged.tp2).toBe(2760)
    expect(staged.tp1GainPct).toBe(6)
    expect(staged.tp2GainPct).toBe(10.4)
  })

  it('calculates institutional portfolio crypto split (5% total, 70/30 BTC/ETH)', () => {
    // $100,000 total net worth
    // 5% crypto = $5,000
    // 70% BTC = $3,500
    // 30% ETH = $1,500
    const alloc = calculateMacroCryptoAllocation(100000, 5, 0.7)

    expect(alloc.totalCryptoSleeveUsd).toBe(5000)
    expect(alloc.btcSleeveUsd).toBe(3500)
    expect(alloc.ethSleeveUsd).toBe(1500)
  })

  it('provides reference ETH structural key levels', () => {
    expect(ETH_KEY_LEVELS.PIVOTAL_SUPPORT).toBe(2400)
    expect(ETH_KEY_LEVELS.BREAKOUT_LEVEL).toBe(2825)
  })
})
