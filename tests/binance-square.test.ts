import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  formatSignalForSquare,
  formatPredictionForSquare,
  isBinanceSquareConfigured,
  postToBinanceSquare,
  sendTestSquarePost,
  sanitizeHashtags,
  uploadImageToSquare,
  canAutoPostSymbolToSquare,
  publishSignalToSquare,
  getDailySquarePostTracker,
  recordSquareDailyPost,
  formatPredictionMetForSquare,
  checkAndPublishMetSquarePredictions,
} from '@/lib/notify/binance-square'
import {
  setSetting,
  recordSquarePostedPrediction,
  getPendingSquarePostedPredictions,
  updateSquarePostedPredictionStatus,
  getSquarePostedPredictions,
  getDb,
} from '@/lib/db/client'
import { squarePostedPredictions } from '@/lib/db/schema'
import * as binanceData from '@/lib/data/binance'
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
      expect(text).not.toContain('Key Indicators')
      expect(text).not.toContain('EMA Trend')
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
    it('formats a future gainer prediction with target ranges and risk levels without catalyst or confidence', () => {
      const text = formatPredictionForSquare(mockPrediction)
      expect(text).toContain('🔥 TOP GAINER PREDICTION: SOL/USDT')
      expect(text).toContain('Horizon: 24 Hours')
      expect(text).toContain('Upside Target: +8.5% ~ +14.2%')
      expect(text).toContain('Stop Loss: $142.74')
      expect(text).not.toContain('Confidence')
      expect(text).not.toContain('AI Catalyst')
      expect(text).not.toContain('Ecosystem Expansion & Breakout')
      expect(text).toContain('#Solana')
      expect(text).toContain('#SOL')
    })
  })

  describe('sanitizeHashtags', () => {
    it('caps hashtags to maxHashtags and strips excess hash symbols', () => {
      const input = 'Check out #one #two #three #four #five #six #seven'
      const output = sanitizeHashtags(input, 4)
      expect(output).toBe('Check out #one #two #three #four five six seven')
      const hashtagCount = (output.match(/#[a-zA-Z0-9_]+/g) || []).length
      expect(hashtagCount).toBe(4)
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
      expect(call[0]).toBe('https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add')
      expect(call[1].headers['X-Square-OpenAPI-Key']).toBe('square_key_xyz')
      expect(call[1].headers['clienttype']).toBe('binanceSkill')
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

    it('attaches image to post when imageBuffer is provided', async () => {
      const mockFetch = vi.fn()
        // 1. presigned URL call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '000000',
            data: { presignedUrl: 'https://s3.amazonaws.com/test-upload', fileTicket: 'ticket_123' },
          }),
        })
        // 2. S3 PUT call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
        })
        // 3. imageStatus poll call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '000000',
            data: { status: 1, imageUrl: 'https://public.bnbstatic.com/image/chart.png' },
          }),
        })
        // 4. content/add publish call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: '000000',
            data: { id: 'sq_post_with_chart' },
          }),
        })

      globalThis.fetch = mockFetch

      const samplePng = Buffer.from('mock-png-data')
      const result = await postToBinanceSquare(
        'Candle chart analysis #BinanceSquare',
        { enabled: true, apiKey: 'square_key_xyz', mode: 'action-change' },
        samplePng
      )

      expect(result.success).toBe(true)
      expect(result.contentId).toBe('sq_post_with_chart')
      expect(result.imageUrl).toBe('https://public.bnbstatic.com/image/chart.png')

      // Verify the final publish call contained imageList and contentType: 1
      const publishCall = mockFetch.mock.calls[3]
      expect(publishCall[0]).toBe('https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add')
      const payload = JSON.parse(publishCall[1].body)
      expect(payload.contentType).toBe(1)
      expect(payload.imageList).toEqual(['https://public.bnbstatic.com/image/chart.png'])
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

  describe('canAutoPostSymbolToSquare and daily post quota', () => {
    const today = new Date().toISOString().slice(0, 10)

    beforeEach(() => {
      // Reset daily tracker before each test
      setSetting('square_daily_tracker', JSON.stringify({ date: today, counts: {} }))
    })

    it('rejects when Binance Square auto-posting is disabled or unconfigured', () => {
      const res = canAutoPostSymbolToSquare('ETH/USDT', {
        enabled: false,
        apiKey: 'square_key',
        mode: 'action-change',
      })
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain('disabled or unconfigured')
    })

    it('filters tokens based on allowedTokens list', () => {
      const settings = {
        enabled: true,
        apiKey: 'square_key',
        mode: 'action-change' as const,
        allowedTokens: ['ETH', 'BTC'],
        maxDailyPostsPerToken: 2,
      }

      // ETH should be allowed
      expect(canAutoPostSymbolToSquare('ETH/USDT', settings).allowed).toBe(true)
      expect(canAutoPostSymbolToSquare('ETH', settings).allowed).toBe(true)

      // BTC should be allowed
      expect(canAutoPostSymbolToSquare('BTC/USDT', settings).allowed).toBe(true)

      // SOL or PEPE should be rejected
      const solRes = canAutoPostSymbolToSquare('SOL/USDT', settings)
      expect(solRes.allowed).toBe(false)
      expect(solRes.reason).toContain('not in the allowed tokens list')
    })

    it('allows all tokens if wildcard * or empty list is configured', () => {
      const wildcardSettings = {
        enabled: true,
        apiKey: 'square_key',
        mode: 'action-change' as const,
        allowedTokens: ['*'],
        maxDailyPostsPerToken: 5,
      }
      expect(canAutoPostSymbolToSquare('DOGE/USDT', wildcardSettings).allowed).toBe(true)
      expect(canAutoPostSymbolToSquare('PEPE/USDT', wildcardSettings).allowed).toBe(true)

      const emptySettings = {
        enabled: true,
        apiKey: 'square_key',
        mode: 'action-change' as const,
        allowedTokens: [],
        maxDailyPostsPerToken: 5,
      }
      expect(canAutoPostSymbolToSquare('SOL/USDT', emptySettings).allowed).toBe(true)
    })

    it('enforces maximum daily posts per token limit', () => {
      const settings = {
        enabled: true,
        apiKey: 'square_key',
        mode: 'action-change' as const,
        allowedTokens: ['ETH'],
        maxDailyPostsPerToken: 2,
      }

      // Initially 0 posts -> allowed
      expect(canAutoPostSymbolToSquare('ETH/USDT', settings).allowed).toBe(true)

      // Record 1st post -> still allowed (1 < 2)
      recordSquareDailyPost('ETH/USDT')
      expect(canAutoPostSymbolToSquare('ETH/USDT', settings).allowed).toBe(true)

      // Record 2nd post -> quota reached (2 >= 2) -> blocked
      recordSquareDailyPost('ETH')
      const blockedRes = canAutoPostSymbolToSquare('ETH/USDT', settings)
      expect(blockedRes.allowed).toBe(false)
      expect(blockedRes.reason).toContain('Daily quota reached for ETH: 2/2')

      // Other token with 0 posts should still be allowed if in allowed list
      const multiTokenSettings = { ...settings, allowedTokens: ['ETH', 'BTC'] }
      expect(canAutoPostSymbolToSquare('BTC/USDT', multiTokenSettings).allowed).toBe(true)
    })

    it('tracks post counts in SQLite tracker across calls', () => {
      recordSquareDailyPost('SOL')
      recordSquareDailyPost('SOL')
      const tracker = getDailySquarePostTracker()
      expect(tracker.date).toBe(today)
      expect(tracker.counts.SOL).toBe(2)
    })
  })

  describe('publishSignalToSquare', () => {
    const today = new Date().toISOString().slice(0, 10)

    beforeEach(() => {
      setSetting('square_daily_tracker', JSON.stringify({ date: today, counts: {} }))
    })

    it('skips publication when auto-post is disabled without making network calls', async () => {
      const mockFetch = vi.fn()
      globalThis.fetch = mockFetch

      const result = await publishSignalToSquare(mockSignal, {
        enabled: false,
        apiKey: 'square_key',
        mode: 'action-change',
        allowedTokens: ['ETH'],
        maxDailyPostsPerToken: 2,
      })

      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('skips publication and does not increment quota when token is not allowed', async () => {
      const mockFetch = vi.fn()
      globalThis.fetch = mockFetch

      const signalForBlocked = { ...mockSignal, symbol: 'DOGE/USDT' }
      const result = await publishSignalToSquare(signalForBlocked, {
        enabled: true,
        apiKey: 'square_key',
        mode: 'action-change',
        allowedTokens: ['ETH', 'BTC'],
        maxDailyPostsPerToken: 2,
      })

      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
      expect(getDailySquarePostTracker().counts.DOGE).toBeUndefined()
    })

    it('publishes and increments daily quota when allowed and successful', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '000000',
          data: { id: 'sq_auto_post_1' },
        }),
      })
      globalThis.fetch = mockFetch

      const settings = {
        enabled: true,
        apiKey: 'square_key',
        mode: 'action-change' as const,
        allowedTokens: ['ETH'],
        maxDailyPostsPerToken: 2,
      }

      const result = await publishSignalToSquare(mockSignal, settings)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const tracker = getDailySquarePostTracker()
      expect(tracker.counts.ETH).toBe(1)
    })
  })

  describe('formatPredictionMetForSquare', () => {
    it('formats celebratory post with target range, achieved price and gain', () => {
      const predRow = {
        id: 1,
        createdAt: Date.now() - 3600000,
        symbol: 'SOL/USDT',
        base: 'SOL',
        name: 'Solana',
        horizon: '24H',
        horizonLabel: '24 Hours',
        entryPrice: 150.0,
        targetPriceLow: 163.0,
        targetPriceHigh: 171.5,
        stopLossPrice: 142.5,
        predictedGainMin: 8.5,
        predictedGainMax: 14.2,
        contentId: 'sq_initial_123',
        status: 'PENDING',
        metAt: null,
        metPrice: null,
        metPostId: null,
      }

      const post = formatPredictionMetForSquare(predRow, 164.5)
      expect(post).toContain('🎯 TARGET REACHED: SOL/USDT')
      expect(post).toContain('Horizon: 24 Hours')
      expect(post).toContain('Entry Price: $150.00')
      expect(post).toContain('Target Range: $163.00 - $171.50 (+8.5% ~ +14.2%)')
      expect(post).toContain('Hit Price: $164.50 (+9.67% Gain)')
      expect(post).toContain('#SOL')
      expect(post).toContain('#TargetHit')
    })
  })

  describe('square_posted_predictions database tracking', () => {
    beforeEach(() => {
      getDb().delete(squarePostedPredictions).run()
    })

    it('records a prediction and retrieves pending predictions', () => {
      const id = recordSquarePostedPrediction(mockPrediction, 'content_123')
      expect(id).toBeGreaterThan(0)

      const pending = getPendingSquarePostedPredictions()
      expect(pending.length).toBe(1)
      expect(pending[0].symbol).toBe('SOL/USDT')
      expect(pending[0].status).toBe('PENDING')
      expect(pending[0].contentId).toBe('content_123')

      updateSquarePostedPredictionStatus(id, 'TARGET_MET', 165.0, 'post_met_456')

      const pendingAfter = getPendingSquarePostedPredictions()
      expect(pendingAfter.length).toBe(0)

      const all = getSquarePostedPredictions()
      expect(all.length).toBe(1)
      expect(all[0].status).toBe('TARGET_MET')
      expect(all[0].metPrice).toBe(165.0)
      expect(all[0].metPostId).toBe('post_met_456')
    })
  })

  describe('checkAndPublishMetSquarePredictions', () => {
    beforeEach(() => {
      getDb().delete(squarePostedPredictions).run()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns empty result when no predictions are pending', async () => {
      const result = await checkAndPublishMetSquarePredictions()
      expect(result.checked).toBe(0)
      expect(result.metCount).toBe(0)
    })

    it('publishes celebratory post to Square and marks TARGET_MET when price hits target', async () => {
      // 1. Seed a pending prediction with target $163
      recordSquarePostedPrediction(
        {
          ...mockPrediction,
          currentPrice: 150.0,
          targetPriceLow: 163.0,
          targetPriceHigh: 171.0,
          stopLossPrice: 142.0,
        },
        'content_orig_1'
      )

      // 2. Mock ticker to return $165 (target met!)
      vi.spyOn(binanceData, 'fetchMultipleTickers').mockResolvedValue({
        'SOL/USDT': { price: 165.0, high: 166.0, low: 149.0, change24h: 10, quoteVolume: 1000000 },
      })

      // 3. Mock Square publish fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '000000',
          data: { id: 'sq_met_celebration_999' },
        }),
      })
      globalThis.fetch = mockFetch

      const settings = {
        enabled: true,
        apiKey: 'square_key_test',
        mode: 'action-change' as const,
        allowedTokens: ['SOL'],
        maxDailyPostsPerToken: 5,
      }

      const result = await checkAndPublishMetSquarePredictions(settings)

      expect(result.checked).toBe(1)
      expect(result.metCount).toBe(1)
      expect(result.details[0].status).toBe('TARGET_MET')
      expect(result.details[0].squarePostId).toBe('sq_met_celebration_999')

      // Verify the post content sent to Binance Square
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.bodyTextOnly).toContain('🎯 TARGET REACHED: SOL/USDT')
      expect(callBody.bodyTextOnly).toContain('#TargetHit')

      // Verify database updated
      const pendingAfter = getPendingSquarePostedPredictions()
      expect(pendingAfter.length).toBe(0)
    })
  })
})

