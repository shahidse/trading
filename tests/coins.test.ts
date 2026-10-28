import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SYMBOL,
  TOP_COINS,
  getCoinBySymbol,
  isValidSymbol,
  normalizeSymbol,
} from '@/lib/constants/coins'

describe('coins constants and symbol resolution', () => {
  it('preserves default symbol as ETH/USDT', () => {
    expect(DEFAULT_SYMBOL).toBe('ETH/USDT')
    const eth = getCoinBySymbol('ETH/USDT')
    expect(eth?.default).toBe(true)
    expect(eth?.base).toBe('ETH')
    expect(eth?.quote).toBe('USDT')
  })

  const requestedCoins = [
    { input: 'blur', expectedSymbol: 'BLUR/USDT', base: 'BLUR', category: 'Layer 2' },
    { input: 'liteb', expectedSymbol: 'LITEB/USDT', base: 'LITEB', category: 'bStock' },
    { input: 'wenb', expectedSymbol: 'WENB/USDT', base: 'WENB', category: 'bStock' },
    { input: 'snxxb', expectedSymbol: 'SNXXB/USDT', base: 'SNXXB', category: 'bStock' },
    { input: 'aaoib', expectedSymbol: 'AAOIB/USDT', base: 'AAOIB', category: 'bStock' },
    { input: 'axtib', expectedSymbol: 'AXTIB/USDT', base: 'AXTIB', category: 'bStock' },
    { input: 'shazb', expectedSymbol: 'SHAZB/USDT', base: 'SHAZB', category: 'bStock' },
    { input: 'stxb', expectedSymbol: 'STXB/USDT', base: 'STXB', category: 'bStock' },
    { input: 'muub', expectedSymbol: 'MUUB/USDT', base: 'MUUB', category: 'bStock' },
    { input: 'bb', expectedSymbol: 'BB/USDT', base: 'BB', category: 'DeFi' },
    { input: 'at', expectedSymbol: 'AT/USDT', base: 'AT', category: 'Infrastructure' },
    { input: 'cgpt', expectedSymbol: 'CGPT/USDT', base: 'CGPT', category: 'AI / Data' },
    { input: 'xpl', expectedSymbol: 'XPL/USDT', base: 'XPL', category: 'Layer 1' },
    { input: 'arb', expectedSymbol: 'ARB/USDT', base: 'ARB', category: 'Layer 2' },
    { input: 'flux', expectedSymbol: 'FLUX/USDT', base: 'FLUX', category: 'Infrastructure' },
    { input: 'ark', expectedSymbol: 'ARK/USDT', base: 'ARK', category: 'Layer 1' },
    { input: 'woo', expectedSymbol: 'WOO/USDT', base: 'WOO', category: 'DeFi' },
    { input: 'ltc', expectedSymbol: 'LTC/USDT', base: 'LTC', category: 'Layer 1' },
    { input: 'home', expectedSymbol: 'HOME/USDT', base: 'HOME', category: 'DeFi' },
    { input: 'dodo', expectedSymbol: 'DODO/USDT', base: 'DODO', category: 'DeFi' },
    { input: 'pnut', expectedSymbol: 'PNUT/USDT', base: 'PNUT', category: 'Meme' },
    { input: 'soph', expectedSymbol: 'SOPH/USDT', base: 'SOPH', category: 'Layer 2' },
    { input: 'morpho', expectedSymbol: 'MORPHO/USDT', base: 'MORPHO', category: 'DeFi' },
    { input: 'mega', expectedSymbol: 'MEGA/USDT', base: 'MEGA', category: 'Layer 2' },
    { input: 'parti', expectedSymbol: 'PARTI/USDT', base: 'PARTI', category: 'Layer 1' },
    { input: 'plum', expectedSymbol: 'PLUME/USDT', base: 'PLUME', category: 'Layer 2' },
    { input: 'aave', expectedSymbol: 'AAVE/USDT', base: 'AAVE', category: 'DeFi' },
    { input: 'eigen', expectedSymbol: 'EIGEN/USDT', base: 'EIGEN', category: 'DeFi' },
    { input: 'ace', expectedSymbol: 'ACE/USDT', base: 'ACE', category: 'Layer 1' },
    { input: 'nxpc', expectedSymbol: 'NXPC/USDT', base: 'NXPC', category: 'Infrastructure' },
    { input: 'sign', expectedSymbol: 'SIGN/USDT', base: 'SIGN', category: 'Infrastructure' },
  ]

  it('recognizes all 31 requested coins through isValidSymbol and getCoinBySymbol', () => {
    for (const coin of requestedCoins) {
      expect(isValidSymbol(coin.input)).toBe(true)
      expect(isValidSymbol(coin.expectedSymbol)).toBe(true)

      const coinInfo = getCoinBySymbol(coin.input)
      expect(coinInfo).toBeDefined()
      expect(coinInfo?.symbol).toBe(coin.expectedSymbol)
      expect(coinInfo?.base).toBe(coin.base)
      expect(coinInfo?.category).toBe(coin.category)
      expect(coinInfo?.quote).toBe('USDT')
    }
  })

  it('normalizes coin tickers with various formats and cases', () => {
    expect(normalizeSymbol('plum')).toBe('PLUME/USDT')
    expect(normalizeSymbol('PLUM')).toBe('PLUME/USDT')
    expect(normalizeSymbol('plum/usdt')).toBe('PLUME/USDT')
    expect(normalizeSymbol('PLUMUSDT')).toBe('PLUME/USDT')
    expect(normalizeSymbol('liteb')).toBe('LITEB/USDT')
    expect(normalizeSymbol('LITEBUSDT')).toBe('LITEB/USDT')
    expect(normalizeSymbol('snxxb')).toBe('SNXXB/USDT')
    expect(normalizeSymbol('stxb')).toBe('STXB/USDT')
  })

  it('distinguishes STX (Stacks Layer 1) from STXB (Seagate Tokenized bStock)', () => {
    const stx = getCoinBySymbol('STX/USDT')
    const stxb = getCoinBySymbol('STXB/USDT')

    expect(stx).toBeDefined()
    expect(stx?.name).toBe('Stacks')
    expect(stx?.category).toBe('Layer 1')

    expect(stxb).toBeDefined()
    expect(stxb?.name).toContain('Seagate')
    expect(stxb?.category).toBe('bStock')
  })

  it('has tokenized bStocks in TOP_COINS under the bStock category', () => {
    const bStocks = TOP_COINS.filter((c) => c.category === 'bStock')
    expect(bStocks.length).toBeGreaterThanOrEqual(8)
    const symbols = bStocks.map((c) => c.symbol)
    expect(symbols).toContain('LITEB/USDT')
    expect(symbols).toContain('WENB/USDT')
    expect(symbols).toContain('SNXXB/USDT')
    expect(symbols).toContain('AAOIB/USDT')
    expect(symbols).toContain('AXTIB/USDT')
    expect(symbols).toContain('SHAZB/USDT')
    expect(symbols).toContain('STXB/USDT')
    expect(symbols).toContain('MUUB/USDT')
  })
})
