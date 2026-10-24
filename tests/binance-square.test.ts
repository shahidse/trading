import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  formatSignalForSquare,
  formatPredictionForSquare,
  isBinanceSquareConfigured,
  postToBinanceSquare,
  sendTestSquarePost,
} from '@/lib/notify/binance-square'
import type { Signal } from '@/lib/types'
import type { FutureCoinPrediction } from '@/lib/data/predictions'

const mockSignal: Signal = {
  symbol: 'ETH/USDT',
  timeframe: '15m',
  timestamp: 1718000000000,
  price: 3200,
  chainlinkPrice: 3202,
  divergencePct: 0.06,
  score: 65,
  direction: 'LONG',
  confidence: 85,
  reasons: ['EMA bullish stack 20 > 50 > 200', 'MACD positive crossover above signal'],
  indicators: [
    { key: 'emaTrend', label: 'EMA Trend', group: 'trend', raw: 80, baseWeight: 0.1, weight: 0.1, contribution: 8, detail: 'Stack aligned' },
    { key: 'macd', label: 'MACD', group: 'trend', raw: 70, baseWeight: 0.11, weight: 0.11, contribution: 7.7, detail: 'Positive cross' },
  ],
  confluence: {
    bullish: 7,
    bearish: 1,
    agreeing: 7,
    conflicting: 1,
    multiplier: 1.15,
    verdict: 'strong-agreement',
    detail: '7 of 10 directional indicators agree bullish',
  },
  regime: {
    adx: 28.5,
    regime: 'trending',
    direction: 'bullish',
    atrPct: 1.2,
    atrValue: 38.5,
    volatilityRatio: 1.0,
    thresholdMultiplier: 1.0,
    tilt: 'trend',
    detail: 'ADX 28.5 confirms strong trending regime',
  },
  thresholdsUsed: { long: 25, short: -25 },
  plan: {
    action: 'BUY',
    gate: 'open',
    headline: 'Enter spot long with dynamic ATR risk bounds',
    levels: {
      entry: 3200,
      stopLoss: 3120,
      takeProfit: 3360,
      stopDistancePct: 2.5,
      targetDistancePct: 5.0,
      riskReward: 2.0,
      stagedTargets: [
        { tier: 1, sizePct: 75, price: 3320, distancePct: 3.75, riskReward: 1.5, action: 'breakeven-stop' },
      ],
      breakevenPrice: 3200,
    },
    protectiveStop: null,
    forFlat: 'Enter spot position now with limit or market order',
    forHolder: 'Maintain existing position with protective stop at 3,120',
    rationale: ['Confirmed breakout above dynamic resistance'],
  },
}

const mockPrediction: FutureCoinPrediction = {
  symbol: 'SOL/USDT',
  name: 'Solana',
  base: 'SOL',
  category: 'Layer 1',
  currentPrice: 150.25,
  change24h: 4.8,
  quoteVolume: 1875000000,
  horizon: '24H',
  horizonLabel: '24 Hours',
  predictedGainPctMin: 8.5,
  predictedGainPctMax: 14.2,
  targetPriceLow: 163.02,
  targetPriceHigh: 171.58,
  entryZoneLow: 148.5,
  entryZoneHigh: 151.0,
  stopLossPrice: 142.74,
  stopLossPct: 5.0,
  riskRewardRatio: 2.3,
  confidenceScore: 84,
  riskLevel: 'MODERATE',
  catalyst: 'MOMENTUM_EXPANSION',
  catalystTitle: 'Ecosystem Expansion & Breakout',
  thesis: 'Strong DeFi inflow and TVL acceleration with 4h momentum continuation.',
  triggers: ['4h breakout with volume expansion > 2x', 'RSI holding bullish zone above 55'],
  rank: 1,
  profitEstimate1kUsd: { min: 85, max: 142 },
}

describe('Binance Square Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('formatSignalForSquare', () => {
    it('formats a BUY signal with entry, stop loss, targets, and hashtags', () => {
      const text = formatSignalForSquare(mockSignal)
      expect(text).toContain('🚨 TRADE SIGNAL: ETH/USDT')
      expect(text).toContain('Action: BUY')
      expect(text).toContain('Entry: $3,200.00')
      expect(text).toContain('Stop Loss: $3,120.00')
      expect(text).toContain('Take Profit: $3,360.00')
      expect(text).toContain('R:R: 2:1')
      expect(text).toContain('#BinanceSquare')
      expect(text).toContain('#ETH')
      expect(text).toContain('Disclaimer: Automated analysis')
    })

    it('formats a SELL signal appropriately', () => {
      const sellSignal: Signal = {
        ...mockSignal,
        direction: 'SHORT',
        plan: {
          ...mockSignal.plan,
          action: 'SELL',
          levels: null,
          protectiveStop: 3100,
        },
      }
      const text = formatSignalForSquare(sellSignal)
      expect(text).toContain('Action: SELL')
      expect(text).toContain('Protective Stop: $3,100.00')
    })
  })

  describe('formatPredictionForSquare', () => {
    it('formats a future gainer prediction with target ranges and thesis', () => {
      const text = formatPredictionForSquare(mockPrediction)
      expect(text).toContain('🔥 TOP GAINER PREDICTION: SOL/USDT')
      expect(text).toContain('Horizon: 24 Hours')
      expect(text).toContain('Upside Target: +8.5% ~ +14.2%')
      expect(text).toContain('Confidence: 84%')
      expect(text).toContain('Stop Loss: $142.74')
      expect(text).toContain('Ecosystem Expansion & Breakout')
      expect(text).toContain('#Solana')
      expect(text).toContain('#SOL')
    })
  })

  describe('isBinanceSquareConfigured', () => {
    it('returns true when key is present and enabled', () => {
      expect(isBinanceSquareConfigured({ enabled: true, apiKey: 'test-key-123', mode: 'action-change' })).toBe(true)
    })

    it('returns false when key is empty or enabled is false', () => {
      expect(isBinanceSquareConfigured({ enabled: false, apiKey: 'test-key-123', mode: 'action-change' })).toBe(false)
      expect(isBinanceSquareConfigured({ enabled: true, apiKey: '', mode: 'action-change' })).toBe(false)
      expect(isBinanceSquareConfigured({ enabled: true, apiKey: '   ', mode: 'action-change' })).toBe(false)
    })
  })

  describe('postToBinanceSquare', () => {
    it('returns success and contentId on valid API response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '000000',
          message: 'SUCCESS',
          data: { id: 'sq_post_99998888' },
        }),
      })
      globalThis.fetch = mockFetch

      const result = await postToBinanceSquare('Test content body', {
        enabled: true,
        apiKey: 'square_key_xyz',
        mode: 'action-change',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://www.binance.com/bapi/composite/v1/private/square/openapi/post/create')
      expect(call[1].headers['X-Square-OpenAPI-Key']).toBe('square_key_xyz')
      expect(JSON.parse(call[1].body)).toEqual({ bodyTextOnly: 'Test content body' })

      expect(result.success).toBe(true)
      expect(result.contentId).toBe('sq_post_99998888')
    })

    it('returns failure when API returns non-000000 code', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '100001',
          message: 'Invalid OpenAPI Key',
        }),
      })

      const result = await postToBinanceSquare('Test content body', {
        enabled: true,
        apiKey: 'bad_key',
        mode: 'action-change',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid OpenAPI Key')
    })

    it('handles network exceptions gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection timed out'))

      const result = await postToBinanceSquare('Test content body', {
        enabled: true,
        apiKey: 'valid_key',
        mode: 'action-change',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection timed out')
    })
  })

  describe('sendTestSquarePost', () => {
    it('dispatches a verification test post', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '000000',
          data: { id: 'sq_test_123' },
        }),
      })
      globalThis.fetch = mockFetch

      const result = await sendTestSquarePost({
        enabled: true,
        apiKey: 'square_key_test',
        mode: 'action-change',
      })

      expect(result.success).toBe(true)
      expect(result.contentId).toBe('sq_test_123')
    })
  })
})
