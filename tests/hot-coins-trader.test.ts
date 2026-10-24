import { describe, expect, it } from 'vitest'
import {
  evaluateHotCoinCandidates,
  type HotCoinCandidate,
} from '@/lib/exchange/hot-coins-trader'
import {
  DEFAULT_HOT_COIN_SETTINGS,
  mergeHotCoinSettings,
  type HotCoinTradingSettings,
} from '@/lib/exchange/hot-coins-settings'
import type { ScannedHotCoin } from '@/lib/data/scanner'

function mockCoin(partial: Partial<ScannedHotCoin>): ScannedHotCoin {
  return {
    symbol: 'PEPE/USDT',
    base: 'PEPE',
    name: 'Pepe',
    category: 'Meme',
    price: 0.00001,
    change24h: 8.5,
    quoteVolume: 50_000_000,
    high24h: 0.000011,
    low24h: 0.000009,
    rangePositionPct: 92,
    volatilityPct: 22,
    heatScore: 85,
    signalType: 'BREAKOUT_IMMINENT',
    signalHeadline: 'Massive whale accumulation pressing 24h high',
    predictedUpsidePct: 12,
    predictedUpsideMaxPct: 25,
    entryPrice: 0.00001,
    stopLossPrice: 0.0000097,
    stopLossPct: 3.0,
    takeProfitPrice: 0.0000112,
    takeProfitPriceHigh: 0.0000125,
    riskRewardRatio: 4.0,
    targetPrice: 0.0000112,
    targetPriceHigh: 0.0000125,
    expectedPumpTime: '15m - 1h',
    pumpTimeframeShort: '15m',
    pumpWindow: 'IMMINENT_15M',
    expectedGainPer1k: 120,
    expectedGainMaxPer1k: 250,
    riskLevel: 'MEDIUM',
    rank: 1,
    ...partial,
  }
}

describe('Hot Coin Trading Settings', () => {
  it('has safe defaults (disabled by default, dry-run on)', () => {
    expect(DEFAULT_HOT_COIN_SETTINGS.enabled).toBe(false)
    expect(DEFAULT_HOT_COIN_SETTINGS.dryRun).toBe(true)
    expect(DEFAULT_HOT_COIN_SETTINGS.topCoinsCount).toBe(3)
    expect(DEFAULT_HOT_COIN_SETTINGS.minHeatScore).toBe(70)
    expect(DEFAULT_HOT_COIN_SETTINGS.orderNotionalUsd).toBe(50)
    expect(DEFAULT_HOT_COIN_SETTINGS.maxNotionalUsd).toBe(100)
    expect(DEFAULT_HOT_COIN_SETTINGS.dailyLossLimitUsd).toBe(50)
  })

  it('safely merges partial patches with bounds clamping', () => {
    const merged = mergeHotCoinSettings({
      enabled: true,
      topCoinsCount: 99, // clamped to 10
      minHeatScore: 5,   // clamped to 10
      orderNotionalUsd: 75,
      cooldownMinutes: 2, // clamped to 5
    })

    expect(merged.enabled).toBe(true)
    expect(merged.topCoinsCount).toBe(10)
    expect(merged.minHeatScore).toBe(10)
    expect(merged.orderNotionalUsd).toBe(75)
    expect(merged.cooldownMinutes).toBe(5)
  })
})

describe('evaluateHotCoinCandidates', () => {
  const settings: HotCoinTradingSettings = {
    ...DEFAULT_HOT_COIN_SETTINGS,
    topCoinsCount: 3,
    minHeatScore: 70,
    cooldownMinutes: 60,
  }

  it('selects top 3 eligible coins by heatScore', () => {
    const coins: ScannedHotCoin[] = [
      mockCoin({ symbol: 'PEPE/USDT', base: 'PEPE', heatScore: 92, rank: 1 }),
      mockCoin({ symbol: 'SOL/USDT', base: 'SOL', heatScore: 85, rank: 2 }),
      mockCoin({ symbol: 'DOGE/USDT', base: 'DOGE', heatScore: 78, rank: 3 }),
      mockCoin({ symbol: 'SUI/USDT', base: 'SUI', heatScore: 74, rank: 4 }),
      mockCoin({ symbol: 'NEAR/USDT', base: 'NEAR', heatScore: 55, rank: 5 }), // below minHeatScore
    ]

    const result = evaluateHotCoinCandidates(
      coins,
      settings,
      () => false, // no open positions
      () => null,  // no recent trades
    )

    expect(result.eligibleToBuy.length).toBe(3)
    expect(result.eligibleToBuy[0].coin.symbol).toBe('PEPE/USDT')
    expect(result.eligibleToBuy[1].coin.symbol).toBe('SOL/USDT')
    expect(result.eligibleToBuy[2].coin.symbol).toBe('DOGE/USDT')
  })

  it('skips coins that have an existing open position to prevent double buying', () => {
    const coins: ScannedHotCoin[] = [
      mockCoin({ symbol: 'PEPE/USDT', base: 'PEPE', heatScore: 95, rank: 1 }),
      mockCoin({ symbol: 'SOL/USDT', base: 'SOL', heatScore: 88, rank: 2 }),
      mockCoin({ symbol: 'DOGE/USDT', base: 'DOGE', heatScore: 82, rank: 3 }),
      mockCoin({ symbol: 'SUI/USDT', base: 'SUI', heatScore: 75, rank: 4 }),
    ]

    const result = evaluateHotCoinCandidates(
      coins,
      settings,
      (sym) => sym === 'PEPE/USDT', // PEPE already open
      () => null,
    )

    const pepeCand = result.topCandidates.find((c) => c.coin.symbol === 'PEPE/USDT')
    expect(pepeCand?.eligible).toBe(false)
    expect(pepeCand?.skipReason).toContain('Already holding')

    // SUI steps up into the top 3 eligible
    expect(result.eligibleToBuy.map((c) => c.coin.symbol)).toEqual([
      'SOL/USDT',
      'DOGE/USDT',
      'SUI/USDT',
    ])
  })

  it('skips coins within the cooldown window', () => {
    const now = Date.now()
    const coins: ScannedHotCoin[] = [
      mockCoin({ symbol: 'PEPE/USDT', base: 'PEPE', heatScore: 95, rank: 1 }),
      mockCoin({ symbol: 'SOL/USDT', base: 'SOL', heatScore: 88, rank: 2 }),
    ]

    const result = evaluateHotCoinCandidates(
      coins,
      settings,
      () => false,
      (sym) => (sym === 'PEPE/USDT' ? now - 20 * 60 * 1000 : null), // bought 20m ago (cooldown is 60m)
      now,
    )

    const pepeCand = result.topCandidates.find((c) => c.coin.symbol === 'PEPE/USDT')
    expect(pepeCand?.eligible).toBe(false)
    expect(pepeCand?.skipReason).toContain('Cooldown active')

    expect(result.eligibleToBuy.length).toBe(1)
    expect(result.eligibleToBuy[0].coin.symbol).toBe('SOL/USDT')
  })

  it('filters out coins below minHeatScore', () => {
    const coins: ScannedHotCoin[] = [
      mockCoin({ symbol: 'PEPE/USDT', heatScore: 65, rank: 1 }),
      mockCoin({ symbol: 'SOL/USDT', heatScore: 50, rank: 2 }),
    ]

    const result = evaluateHotCoinCandidates(
      coins,
      settings,
      () => false,
      () => null,
    )

    expect(result.eligibleToBuy.length).toBe(0)
    expect(result.topCandidates[0].skipReason).toContain('below threshold')
  })

  it('generates valid trade levels for bracket orders', () => {
    const coin = mockCoin({
      price: 100,
      entryPrice: 100,
      stopLossPrice: 97,
      targetPrice: 108,
    })

    const result = evaluateHotCoinCandidates(
      [coin],
      settings,
      () => false,
      () => null,
    )

    const cand = result.eligibleToBuy[0]
    expect(cand.levels.entry).toBe(100)
    expect(cand.levels.stopLoss).toBe(97)
    expect(cand.levels.takeProfit).toBe(108)
    expect(cand.levels.stopDistancePct).toBe(3)
    expect(cand.levels.targetDistancePct).toBe(8)
    expect(cand.levels.riskReward).toBeCloseTo(2.67, 1)
  })
})
