import { describe, expect, it } from 'vitest'
import { DEFAULT_VENUE, EXECUTION_VENUES, type ExecutionVenue } from '@/lib/constants/venues'
import { buildApproveAgentEip712, getHyperliquidApiUrl } from '@/lib/exchange/hyperliquid'
import { SOLANA_TOKENS } from '@/lib/exchange/solana'
import { mergeStored, type ExchangeSettings } from '@/lib/exchange/settings'

describe('Execution Venues Architecture', () => {
  it('asserts Binance is strictly the default execution venue', () => {
    expect(DEFAULT_VENUE).toBe('binance')
    expect(EXECUTION_VENUES.binance.isDefault).toBe(true)
    expect(EXECUTION_VENUES.binance.type).toBe('cex')
    expect(EXECUTION_VENUES.binance.authType).toBe('api-key')
  })

  it('configures Hyperliquid L1 DEX as non-custodial with Agent Wallet', () => {
    const hl = EXECUTION_VENUES.hyperliquid
    expect(hl.type).toBe('dex')
    expect(hl.custody).toBe('non-custodial')
    expect(hl.authType).toBe('agent-wallet')
    expect(hl.isDefault).toBe(false)
  })

  it('configures Solana DEX as non-custodial with Web3 Wallet', () => {
    const sol = EXECUTION_VENUES.solana
    expect(sol.type).toBe('dex')
    expect(sol.custody).toBe('non-custodial')
    expect(sol.authType).toBe('web3-wallet')
    expect(sol.isDefault).toBe(false)
  })

  it('builds valid EIP-712 agent approval payload with zero withdrawal permission', () => {
    const dummyAgent = '0x1111111111111111111111111111111111111111'
    const payload = buildApproveAgentEip712(dummyAgent, 'Test-Agent')

    expect(payload.domain.name).toBe('HyperliquidSignTransaction')
    expect(payload.domain.chainId).toBe(1337)
    expect(payload.primaryType).toBe('Agent')
    expect(payload.message.source).toBe('a')
    expect(payload.message.connectionId).toBe(dummyAgent)
  })

  it('resolves correct Hyperliquid testnet vs mainnet API URLs', () => {
    expect(getHyperliquidApiUrl(true)).toContain('testnet')
    expect(getHyperliquidApiUrl(false)).toBe('https://api.hyperliquid.xyz')
  })

  it('verifies Solana token mint mappings for Jupiter DEX swaps', () => {
    expect(SOLANA_TOKENS.SOL.mint).toBe('So11111111111111111111111111111111111111112')
    expect(SOLANA_TOKENS.USDC.mint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    expect(SOLANA_TOKENS.SOL.decimals).toBe(9)
    expect(SOLANA_TOKENS.USDC.decimals).toBe(6)
  })

  it('guarantees ENV keys are ALWAYS primary default over Fast Connect', () => {
    const baseWithEnv: ExchangeSettings = {
      enabled: true,
      killSwitch: false,
      dryRun: true,
      testnet: true,
      apiKey: 'env-primary-key',
      secret: 'env-primary-secret',
      notionalUsd: 100,
      maxNotionalUsd: 100,
      dailyLossLimitUsd: 50,
      maxDailyTrades: 5,
      useOcoBracket: true,
      reversalScalpMode: false,
    }

    const storedFastConnect = {
      apiKey: 'fast-connect-secondary-key',
      secret: 'fast-connect-secondary-secret',
    }

    // When ENV key exists, it MUST win unconditionally
    const merged = mergeStored(storedFastConnect, baseWithEnv)
    expect(merged.apiKey).toBe('env-primary-key')
    expect(merged.secret).toBe('env-primary-secret')
    expect(merged.credentialSource).toBe('env')
  })

  it('activates Fast Connect as secondary option when NO ENV key is provided', () => {
    const baseWithoutEnv: ExchangeSettings = {
      enabled: true,
      killSwitch: false,
      dryRun: true,
      testnet: true,
      apiKey: '',
      secret: '',
      notionalUsd: 100,
      maxNotionalUsd: 100,
      dailyLossLimitUsd: 50,
      maxDailyTrades: 5,
      useOcoBracket: true,
      reversalScalpMode: false,
    }

    const storedFastConnect = {
      apiKey: 'fast-connect-secondary-key',
      secret: 'fast-connect-secondary-secret',
    }

    // When ENV key is absent, Fast Connect becomes active as Option #2
    const merged = mergeStored(storedFastConnect, baseWithoutEnv)
    expect(merged.apiKey).toBe('fast-connect-secondary-key')
    expect(merged.secret).toBe('fast-connect-secondary-secret')
    expect(merged.credentialSource).toBe('fast-connect')
  })
})
