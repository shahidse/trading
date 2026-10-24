import { describe, expect, it } from 'vitest'
import { getFutureCoinPredictions } from '@/lib/data/predictions'

describe('getFutureCoinPredictions', () => {
  it('generates multi-day coin predictions with valid targets and catalysts', async () => {
    const payload = await getFutureCoinPredictions()

    expect(payload).toBeDefined()
    expect(payload.timestamp).toBeGreaterThan(0)
    expect(payload.totalAnalyzed).toBeGreaterThan(0)
    expect(Array.isArray(payload.predictions)).toBe(true)
    expect(payload.predictions.length).toBeGreaterThan(0)

    // Check first ranked prediction
    const top = payload.predictions[0]
    expect(top.rank).toBe(1)
    expect(top.symbol).toContain('/USDT')
    expect(top.currentPrice).toBeGreaterThan(0)
    expect(top.confidenceScore).toBeGreaterThanOrEqual(60)
    expect(top.confidenceScore).toBeLessThanOrEqual(95)
    expect(['24H', '3_DAYS', '7_DAYS']).toContain(top.horizon)
    expect(top.predictedGainPctMin).toBeGreaterThan(0)
    expect(top.predictedGainPctMax).toBeGreaterThanOrEqual(top.predictedGainPctMin)
    expect(top.targetPriceLow).toBeGreaterThan(top.currentPrice)
    expect(top.targetPriceHigh).toBeGreaterThanOrEqual(top.targetPriceLow)
    expect(top.stopLossPrice).toBeLessThan(top.currentPrice)
    expect(top.riskRewardRatio).toBeGreaterThan(0)
    expect(['LOW', 'MODERATE', 'HIGH_GROWTH']).toContain(top.riskLevel)
    expect([
      'WHALE_ACCUMULATION',
      'VOLATILITY_SQUEEZE',
      'DAILY_GOLDEN_CROSS',
      'OVERSOLD_REVERSAL',
      'MOMENTUM_EXPANSION',
    ]).toContain(top.catalyst)
    expect(typeof top.catalystTitle).toBe('string')
    expect(typeof top.thesis).toBe('string')
    expect(top.triggers.length).toBeGreaterThanOrEqual(1)
    expect(top.profitEstimate1kUsd.min).toBeGreaterThan(0)
    expect(top.profitEstimate1kUsd.max).toBeGreaterThanOrEqual(top.profitEstimate1kUsd.min)

    // Market breadth
    expect(payload.marketBreadth.bullishPercent).toBeGreaterThanOrEqual(0)
    expect(payload.marketBreadth.bullishPercent).toBeLessThanOrEqual(100)
    expect(payload.marketBreadth.averagePredictedGain).toBeGreaterThan(0)

    // Top picks summary
    expect(payload.topPicks).toBeDefined()
    expect(payload.topPicks.best24h).toBeDefined()
    expect(payload.topPicks.best3Days).toBeDefined()
    expect(payload.topPicks.best7Days).toBeDefined()
  }, 25_000)
})
