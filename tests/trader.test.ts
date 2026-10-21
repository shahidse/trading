import { describe, expect, it } from 'vitest'
import type { ExchangeSettings } from '@/lib/exchange/settings'
import { checkGuards, decideTrade } from '@/lib/exchange/trader'

const base: ExchangeSettings = {
  enabled: true,
  killSwitch: false,
  dryRun: true,
  testnet: true,
  apiKey: 'key',
  secret: 'secret',
  notionalUsd: 100,
  maxNotionalUsd: 100,
  dailyLossLimitUsd: 50,
  maxDailyTrades: 5,
  useOcoBracket: true,
  reversalScalpMode: false,
}

describe('decideTrade', () => {
  it('opens a position on a BUY transition', () => {
    const intent = decideTrade('STAY_OUT', 'BUY', false, 100)
    expect(intent?.side).toBe('BUY')
    expect(intent?.notionalUsd).toBe(100)
  })

  it('does not open a second position while one is held', () => {
    expect(decideTrade('STAY_OUT', 'BUY', true, 100)).toBeNull()
  })

  it('does not re-enter when the action was already BUY', () => {
    expect(decideTrade('BUY', 'BUY', false, 100)).toBeNull()
  })

  it('closes the position on SELL while holding', () => {
    expect(decideTrade('BUY', 'SELL', true, 100)?.side).toBe('SELL')
  })

  it('never sells with no position of our own', () => {
    expect(decideTrade('STAY_OUT', 'SELL', false, 100)).toBeNull()
  })

  it('ignores HOLD and STAY_OUT', () => {
    expect(decideTrade('BUY', 'HOLD', true, 100)).toBeNull()
    expect(decideTrade('BUY', 'STAY_OUT', true, 100)).toBeNull()
  })

  it('ignores a fresh neutral signal', () => {
    expect(decideTrade(null, 'STAY_OUT', false, 100)).toBeNull()
  })

  it('allows an initial SELL in dry-run mode without prior BUY', () => {
    const intent = decideTrade('STAY_OUT', 'SELL', false, 100, 'ETH/USDT', true)
    expect(intent?.side).toBe('SELL')
    expect(intent?.notionalUsd).toBe(100)
    expect(intent?.reason).toContain('dry-run initial SELL')
  })

  it('does not duplicate dry-run initial SELL when previousAction was already SELL', () => {
    expect(decideTrade('SELL', 'SELL', false, 100, 'ETH/USDT', true)).toBeNull()
  })

  it('closes an open dry-run SELL with a BUY transition', () => {
    const intent = decideTrade('SELL', 'BUY', true, 100, 'ETH/USDT', true, 'SELL')
    expect(intent?.side).toBe('BUY')
    expect(intent?.notionalUsd).toBe(100)
    expect(intent?.reason).toContain('closing dry-run SELL')
  })
})

describe('checkGuards', () => {
  const ok = { settings: base, notionalUsd: 100, realisedPnl24h: 0 }

  it('passes the happy path', () => {
    expect(checkGuards(ok)).toEqual({ ok: true })
  })

  it('refuses when the kill switch is engaged', () => {
    const result = checkGuards({ ...ok, settings: { ...base, killSwitch: true } })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('Kill switch')
  })

  it('refuses when automatic trading is disabled', () => {
    const result = checkGuards({ ...ok, settings: { ...base, enabled: false } })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('disabled')
  })

  it('refuses without credentials in live or testnet mode', () => {
    expect(checkGuards({ ...ok, settings: { ...base, dryRun: false, apiKey: '' } }).ok).toBe(false)
    expect(checkGuards({ ...ok, settings: { ...base, dryRun: false, secret: '' } }).ok).toBe(false)
  })

  it('permits dry-run paper trading without credentials', () => {
    expect(checkGuards({ ...ok, settings: { ...base, dryRun: true, apiKey: '', secret: '' } }).ok).toBe(true)
  })

  it('refuses an order above the hard cap', () => {
    const result = checkGuards({ ...ok, notionalUsd: 150 })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('cap')
  })

  it('refuses a non-positive order size', () => {
    expect(checkGuards({ ...ok, notionalUsd: 0 }).ok).toBe(false)
    expect(checkGuards({ ...ok, notionalUsd: -10 }).ok).toBe(false)
  })

  it('refuses once the daily loss limit is breached', () => {
    const result = checkGuards({ ...ok, realisedPnl24h: -50 })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('loss limit')
  })

  it('still trades below the daily loss limit', () => {
    expect(checkGuards({ ...ok, realisedPnl24h: -20 })).toEqual({ ok: true })
  })

  it('treats a zero daily loss limit as disabled', () => {
    const result = checkGuards({
      ...ok,
      realisedPnl24h: -9999,
      settings: { ...base, dailyLossLimitUsd: 0 },
    })
    expect(result).toEqual({ ok: true })
  })

  it('applies the kill switch before the cap', () => {
    const result = checkGuards({
      ...ok,
      notionalUsd: 500,
      settings: { ...base, killSwitch: true, maxNotionalUsd: 10 },
    })
    expect(result.ok === false && result.reason).toContain('Kill switch')
  })

  it('refuses when daily trades limit is reached', () => {
    const result = checkGuards({
      ...ok,
      tradesCount24h: 5,
    })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.reason).toContain('Daily trade limit reached')
  })

  it('allows order when below daily trades limit', () => {
    const result = checkGuards({
      ...ok,
      tradesCount24h: 4,
    })
    expect(result.ok).toBe(true)
  })
})

describe('stateless dry-run position tracking', () => {
  it('manages inMemoryDryRunPositions cleanly', async () => {
    const { inMemoryDryRunPositions } = await import('@/lib/exchange/trader')
    inMemoryDryRunPositions.set('TEST/USDT', {
      side: 'BUY',
      quantity: 1,
      price: 100,
      notionalUsd: 100,
      timestamp: Date.now(),
    })
    expect(inMemoryDryRunPositions.has('TEST/USDT')).toBe(true)
    expect(inMemoryDryRunPositions.get('TEST/USDT')?.side).toBe('BUY')
    inMemoryDryRunPositions.delete('TEST/USDT')
    expect(inMemoryDryRunPositions.has('TEST/USDT')).toBe(false)
  })
})
