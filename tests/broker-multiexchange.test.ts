import { describe, expect, it } from 'vitest'
import {
  SUPPORTED_EXCHANGES,
  getBrokerId,
  generateBrokerClientOrderId,
  getBrokerOrderParams,
  applyBrokerOptions,
} from '@/lib/exchange/broker'
import {
  mergeStored,
  publicExchangeSettings,
  type ExchangeSettings,
} from '@/lib/exchange/settings'
import { binance, bybit, okx, bitget } from 'ccxt'

describe('Multi-Exchange & Broker Rebate Upgrade', () => {
  describe('Supported Exchanges Catalog', () => {
    it('exposes all 4 major spot exchanges', () => {
      const ids = SUPPORTED_EXCHANGES.map((e) => e.id)
      expect(ids).toEqual(['binance', 'bybit', 'okx', 'bitget'])
    })

    it('identifies exchanges requiring passphrase', () => {
      const okxInfo = SUPPORTED_EXCHANGES.find((e) => e.id === 'okx')
      const bitgetInfo = SUPPORTED_EXCHANGES.find((e) => e.id === 'bitget')
      const binanceInfo = SUPPORTED_EXCHANGES.find((e) => e.id === 'binance')
      const bybitInfo = SUPPORTED_EXCHANGES.find((e) => e.id === 'bybit')

      expect(okxInfo?.requiresPassphrase).toBe(true)
      expect(bitgetInfo?.requiresPassphrase).toBe(true)
      expect(binanceInfo?.requiresPassphrase).toBe(false)
      expect(bybitInfo?.requiresPassphrase).toBe(false)
    })
  })

  describe('Broker Tag & Rebate Generation', () => {
    it('generates correct broker IDs per exchange', () => {
      expect(getBrokerId('binance')).toBe('x-ETHBOT')
      expect(getBrokerId('bybit')).toBe('ethbot')
      expect(getBrokerId('okx')).toBe('ethbot')
      expect(getBrokerId('bitget')).toBe('ethbot')
      // Custom override
      expect(getBrokerId('binance', 'customPartner')).toBe('customPartner')
    })

    it('generates Binance clientOrderId adhering to broker prefix rules', () => {
      const clientOrderId = generateBrokerClientOrderId('binance', 'x-MYBROKER')
      expect(clientOrderId.startsWith('x-MYBROKER_')).toBe(true)
      expect(clientOrderId.length).toBeLessThanOrEqual(32)
    })

    it('generates Bybit order params with brokerId and orderLinkId', () => {
      const params = getBrokerOrderParams('bybit', 'ethbot')
      expect(params.brokerId).toBe('ethbot')
      expect(typeof params.orderLinkId).toBe('string')
      expect((params.orderLinkId as string).startsWith('ethbot_')).toBe(true)
    })

    it('generates OKX order params with tag and clOrdId', () => {
      const params = getBrokerOrderParams('okx', 'ethbot')
      expect(params.tag).toBe('ethbot')
      expect(typeof params.clOrdId).toBe('string')
      expect((params.clOrdId as string).startsWith('ethbot')).toBe(true)
    })

    it('generates Bitget order params with clientOid', () => {
      const params = getBrokerOrderParams('bitget', 'ethbot')
      expect(typeof params.clientOid).toBe('string')
      expect((params.clientOid as string).startsWith('ethbot_')).toBe(true)
    })

    it('configures CCXT exchange options for internal SDK attribution', () => {
      const b = new binance()
      applyBrokerOptions(b, 'binance', 'x-ETHBOT')
      expect(b.options.broker?.spot).toBe('x-ETHBOT')

      const by = new bybit()
      applyBrokerOptions(by, 'bybit', 'ethbot')
      expect(by.options.brokerId).toBe('ethbot')

      const ok = new okx()
      applyBrokerOptions(ok, 'okx', 'ethbot')
      expect(ok.options.brokerId).toBe('ethbot')
    })
  })

  describe('Multi-Exchange Settings Persistence & Masking', () => {
    const baseSettings: ExchangeSettings = {
      exchangeId: 'binance',
      enabled: false,
      killSwitch: false,
      dryRun: true,
      testnet: true,
      apiKey: '',
      secret: '',
      password: '',
      brokerId: 'x-ETHBOT',
      notionalUsd: 100,
      maxNotionalUsd: 100,
      dailyLossLimitUsd: 50,
      maxDailyTrades: 5,
      useOcoBracket: true,
      reversalScalpMode: false,
      credentialSource: 'none',
    }

    it('merges stored exchangeId, passphrase, and custom brokerId', () => {
      const merged = mergeStored(
        {
          exchangeId: 'bybit',
          password: 'my-passphrase',
          brokerId: 'partner-123',
        },
        baseSettings
      )

      expect(merged.exchangeId).toBe('bybit')
      expect(merged.password).toBe('my-passphrase')
      expect(merged.brokerId).toBe('partner-123')
    })

    it('masks password and exposes passwordSet flag in public settings', () => {
      const settings: ExchangeSettings = {
        ...baseSettings,
        exchangeId: 'okx',
        password: 'secret-passphrase',
        brokerId: 'x-REBATE',
      }

      const pub = publicExchangeSettings(settings)
      expect(pub.exchangeId).toBe('okx')
      expect(pub.passwordSet).toBe(true)
      expect(pub.brokerId).toBe('x-REBATE')
      // Ensure raw password is NOT exposed
      expect((pub as unknown as Record<string, unknown>).password).toBeUndefined()
    })
  })
})
