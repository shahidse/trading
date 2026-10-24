import { describe, expect, it } from 'vitest'
import {
  evaluatePrimaryGuards,
  evaluateHotCoinsGuards,
  analyzeTradingBreakdown,
  generateConfigReport,
} from '@/lib/exchange/config-report'
import { DEFAULT_HOT_COIN_SETTINGS } from '@/lib/exchange/hot-coins-settings'
import type { ExchangeSettings } from '@/lib/exchange/settings'
import type { StoredTradeOrder } from '@/lib/db/client'

const baseSettings: ExchangeSettings = {
  enabled: true,
  killSwitch: false,
  dryRun: true,
  testnet: true,
  apiKey: '',
  secret: '',
  notionalUsd: 50,
  maxNotionalUsd: 100,
  dailyLossLimitUsd: 50,
  maxDailyTrades: 5,
  useOcoBracket: true,
  reversalScalpMode: false,
}

describe('Config Report & Guard Readiness Diagnostic', () => {
  it('detects when kill switch blocks execution', () => {
    const res = evaluatePrimaryGuards({
      settings: { ...baseSettings, killSwitch: true },
      primarySymbol: 'ETH/USDT',
      realisedPnl24h: 0,
      tradesCount24h: 0,
    })

    expect(res.blockers.some((b) => b.includes('Master Kill Switch'))).toBe(true)
    const killGuard = res.guards.find((g) => g.id === 'kill_switch')
    expect(killGuard?.passed).toBe(false)
    expect(killGuard?.status).toBe('blocked')
  })

  it('detects when auto-trading is disabled', () => {
    const res = evaluatePrimaryGuards({
      settings: { ...baseSettings, enabled: false },
      primarySymbol: 'ETH/USDT',
      realisedPnl24h: 0,
      tradesCount24h: 0,
    })

    expect(res.blockers.some((b) => b.includes('Auto-Trading is DISABLED'))).toBe(true)
    const enabledGuard = res.guards.find((g) => g.id === 'primary_enabled')
    expect(enabledGuard?.passed).toBe(false)
  })

  it('detects when daily loss limit is reached or breached', () => {
    const res = evaluatePrimaryGuards({
      settings: baseSettings,
      primarySymbol: 'ETH/USDT',
      realisedPnl24h: -55, // Breached -$50 limit
      tradesCount24h: 2,
    })

    expect(res.blockers.some((b) => b.includes('Daily Loss Limit REACHED'))).toBe(true)
    const lossGuard = res.guards.find((g) => g.id === 'daily_loss')
    expect(lossGuard?.passed).toBe(false)
    expect(lossGuard?.status).toBe('blocked')
  })

  it('detects when 24h daily trades limit is reached', () => {
    const res = evaluatePrimaryGuards({
      settings: baseSettings,
      primarySymbol: 'ETH/USDT',
      realisedPnl24h: 0,
      tradesCount24h: 5, // 5 out of 5 allowed trades
    })

    expect(res.blockers.some((b) => b.includes('Daily Trade Limit REACHED'))).toBe(true)
    const tradeGuard = res.guards.find((g) => g.id === 'daily_trades')
    expect(tradeGuard?.passed).toBe(false)
  })

  it('passes all guards when within safe limits', () => {
    const res = evaluatePrimaryGuards({
      settings: baseSettings,
      primarySymbol: 'ETH/USDT',
      realisedPnl24h: -10,
      tradesCount24h: 2,
    })

    expect(res.blockers).toHaveLength(0)
    expect(res.guards.every((g) => g.passed)).toBe(true)
  })

  it('evaluates hot coins guards properly', () => {
    const resDisabled = evaluateHotCoinsGuards({
      hotSettings: { ...DEFAULT_HOT_COIN_SETTINGS, enabled: false },
      exSettings: baseSettings,
      realisedPnl24h: 0,
      tradesCount24h: 0,
    })
    expect(resDisabled.blockers.some((b) => b.includes('Hot Coins Auto-Trading is DISABLED'))).toBe(true)

    const resBreached = evaluateHotCoinsGuards({
      hotSettings: { ...DEFAULT_HOT_COIN_SETTINGS, enabled: true, dailyLossLimitUsd: 50 },
      exSettings: baseSettings,
      realisedPnl24h: -60,
      tradesCount24h: 0,
    })
    expect(resBreached.blockers.some((b) => b.includes('Hot Coins Daily Loss Limit REACHED'))).toBe(true)
  })

  it('analyzes trading breakdown between hot coins and primary coins accurately', () => {
    const mockOrders: StoredTradeOrder[] = [
      // Primary coin (ETH/USDT)
      {
        id: 1,
        createdAt: Date.now() - 3600000,
        symbol: 'ETH/USDT',
        side: 'BUY',
        type: 'market',
        quantity: 0.05,
        price: 2500,
        notionalUsd: 125,
        status: 'placed',
        reason: 'Signal BUY',
        environment: 'dry-run',
        realisedPnlUsd: null,
        response: null,
        signalId: 1,
      },
      {
        id: 2,
        createdAt: Date.now() - 1800000,
        symbol: 'ETH/USDT',
        side: 'SELL',
        type: 'market',
        quantity: 0.05,
        price: 2600,
        notionalUsd: 130,
        status: 'placed',
        reason: 'Signal SELL',
        environment: 'dry-run',
        realisedPnlUsd: 5,
        response: null,
        signalId: 2,
      },
      // Hot coin 1: SOL/USDT
      {
        id: 3,
        createdAt: Date.now() - 900000,
        symbol: 'SOL/USDT',
        side: 'BUY',
        type: 'market',
        quantity: 0.5,
        price: 150,
        notionalUsd: 75,
        status: 'placed',
        reason: 'Hot Coin Breakout',
        environment: 'dry-run',
        realisedPnlUsd: null,
        response: null,
        signalId: null,
      },
      // Hot coin 2: PEPE/USDT
      {
        id: 4,
        createdAt: Date.now() - 300000,
        symbol: 'PEPE/USDT',
        side: 'BUY',
        type: 'market',
        quantity: 10000000,
        price: 0.000005,
        notionalUsd: 50,
        status: 'placed',
        reason: 'Hot Coin Meme Surge',
        environment: 'dry-run',
        realisedPnlUsd: null,
        response: null,
        signalId: null,
      },
    ]

    const breakdown = analyzeTradingBreakdown(mockOrders, 'ETH/USDT', true)

    // Primary stats
    expect(breakdown.primary.symbol).toBe('ETH/USDT')
    expect(breakdown.primary.executedBuys).toBe(1)
    expect(breakdown.primary.executedSells).toBe(1)
    expect(breakdown.primary.volumeUsd).toBe(255) // 125 + 130
    expect(breakdown.primary.realisedPnlUsd).toBe(5)
    expect(breakdown.primary.winRatePct).toBe(100)

    // Hot coins stats
    expect(breakdown.hotCoins.executedBuys).toBe(2)
    expect(breakdown.hotCoins.volumeUsd).toBe(125) // 75 + 50
    expect(breakdown.hotCoins.coins).toHaveLength(2)
    expect(breakdown.hotCoins.coins[0]?.symbol).toBe('SOL/USDT') // Higher volume first
    expect(breakdown.hotCoins.coins[1]?.symbol).toBe('PEPE/USDT')

    // Grand totals
    expect(breakdown.summary.totalVolumeUsd).toBe(380) // 255 + 125
    expect(breakdown.summary.totalRealisedPnlUsd).toBe(5)
  })

  it('generates a complete config diagnostic report', () => {
    const report = generateConfigReport('ETH/USDT')

    expect(report.verdict).toBeDefined()
    expect(['READY', 'PARTIALLY_BLOCKED', 'BLOCKED']).toContain(report.verdict.overallStatus)
    expect(report.limits.primaryDailyLoss).toBeDefined()
    expect(report.limits.primaryDailyTrades).toBeDefined()
    expect(report.limits.hotCoinsDailyLoss).toBeDefined()
    expect(report.tradingBreakdown).toBeDefined()
  })
})
