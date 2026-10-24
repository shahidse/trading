import { describe, expect, it } from 'vitest'
import { scanHotCoins } from '@/lib/data/scanner'

describe('scanHotCoins', () => {
  it('scans and ranks coins by heat score', async () => {
    const result = await scanHotCoins()

    expect(result).toBeDefined()
    expect(result.timestamp).toBeGreaterThan(0)
    expect(Array.isArray(result.hotCoins)).toBe(true)
    expect(Array.isArray(result.topGainers)).toBe(true)
    expect(Array.isArray(result.breakoutWatchlist)).toBe(true)

    if (result.hotCoins.length > 0) {
      const top = result.hotCoins[0]
      expect(top.heatScore).toBeGreaterThanOrEqual(10)
      expect(top.heatScore).toBeLessThanOrEqual(99)
      expect(top.symbol).toContain('/USDT')
      expect(top.price).toBeGreaterThan(0)
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(top.riskLevel)
      expect([
        'BREAKOUT_IMMINENT',
        'MOMENTUM_SURGE',
        'PRE_PUMP_ACCUMULATION',
        'PULLBACK_BOUNCE',
        'NEUTRAL',
      ]).toContain(top.signalType)
      expect(typeof top.expectedPumpTime).toBe('string')
      expect(top.expectedPumpTime.length).toBeGreaterThan(0)
      expect(['IMMINENT_15M', 'SHORT_TERM_1H', 'ACCUMULATION_4H', 'SWING_24H']).toContain(top.pumpWindow)
      expect(top.targetPrice).toBeGreaterThan(top.price)
      expect(top.predictedUpsidePct).toBeGreaterThan(0)
      expect(top.expectedGainPer1k).toBeGreaterThan(0)
      expect(top.entryPrice).toBeGreaterThan(0)
      expect(top.stopLossPrice).toBeLessThan(top.entryPrice)
      expect(top.riskRewardRatio).toBeGreaterThan(0)
    }
  }, 20_000)
})
