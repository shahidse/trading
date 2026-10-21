export type CoinInfo = {
  symbol: string
  base: string
  quote: string
  name: string
  category: 'Major' | 'Layer 1' | 'Layer 2' | 'DeFi' | 'Meme' | 'AI / Data' | 'Infrastructure'
  default?: boolean
}

export const DEFAULT_SYMBOL = 'ETH/USDT'

/**
 * Top 50 liquid spot trading pairs on Binance.
 * Default is Ethereum (ETH/USDT).
 */
export const TOP_COINS: CoinInfo[] = [
  // --- Majors ---
  { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', name: 'Ethereum', category: 'Major', default: true },
  { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', name: 'Bitcoin', category: 'Major' },
  { symbol: 'SOL/USDT', base: 'SOL', quote: 'USDT', name: 'Solana', category: 'Major' },
  { symbol: 'HYPE/USDT', base: 'HYPE', quote: 'USDT', name: 'Hyperliquid', category: 'Major' },
  { symbol: 'BNB/USDT', base: 'BNB', quote: 'USDT', name: 'BNB', category: 'Major' },
  { symbol: 'XRP/USDT', base: 'XRP', quote: 'USDT', name: 'XRP', category: 'Major' },

  // --- Top Layer 1s ---
  { symbol: 'ADA/USDT', base: 'ADA', quote: 'USDT', name: 'Cardano', category: 'Layer 1' },
  { symbol: 'AVAX/USDT', base: 'AVAX', quote: 'USDT', name: 'Avalanche', category: 'Layer 1' },
  { symbol: 'SUI/USDT', base: 'SUI', quote: 'USDT', name: 'Sui Network', category: 'Layer 1' },
  { symbol: 'NEAR/USDT', base: 'NEAR', quote: 'USDT', name: 'NEAR Protocol', category: 'Layer 1' },
  { symbol: 'APT/USDT', base: 'APT', quote: 'USDT', name: 'Aptos', category: 'Layer 1' },
  { symbol: 'DOT/USDT', base: 'DOT', quote: 'USDT', name: 'Polkadot', category: 'Layer 1' },
  { symbol: 'SEI/USDT', base: 'SEI', quote: 'USDT', name: 'Sei Network', category: 'Layer 1' },
  { symbol: 'FTM/USDT', base: 'FTM', quote: 'USDT', name: 'Fantom / Sonic', category: 'Layer 1' },
  { symbol: 'ATOM/USDT', base: 'ATOM', quote: 'USDT', name: 'Cosmos', category: 'Layer 1' },
  { symbol: 'ALGO/USDT', base: 'ALGO', quote: 'USDT', name: 'Algorand', category: 'Layer 1' },
  { symbol: 'LTC/USDT', base: 'LTC', quote: 'USDT', name: 'Litecoin', category: 'Layer 1' },
  { symbol: 'BCH/USDT', base: 'BCH', quote: 'USDT', name: 'Bitcoin Cash', category: 'Layer 1' },
  { symbol: 'ICP/USDT', base: 'ICP', quote: 'USDT', name: 'Internet Computer', category: 'Layer 1' },
  { symbol: 'KAS/USDT', base: 'KAS', quote: 'USDT', name: 'Kaspa', category: 'Layer 1' },
  { symbol: 'STX/USDT', base: 'STX', quote: 'USDT', name: 'Stacks', category: 'Layer 1' },

  // --- Memecoins ---
  { symbol: 'PEPE/USDT', base: 'PEPE', quote: 'USDT', name: 'Pepe', category: 'Meme' },
  { symbol: 'DOGE/USDT', base: 'DOGE', quote: 'USDT', name: 'Dogecoin', category: 'Meme' },
  { symbol: 'SHIB/USDT', base: 'SHIB', quote: 'USDT', name: 'Shiba Inu', category: 'Meme' },
  { symbol: 'WIF/USDT', base: 'WIF', quote: 'USDT', name: 'dogwifhat', category: 'Meme' },
  { symbol: 'FLOKI/USDT', base: 'FLOKI', quote: 'USDT', name: 'Floki', category: 'Meme' },
  { symbol: 'BONK/USDT', base: 'BONK', quote: 'USDT', name: 'Bonk', category: 'Meme' },

  // --- AI & Data ---
  { symbol: 'FET/USDT', base: 'FET', quote: 'USDT', name: 'Artificial Superintelligence Alliance', category: 'AI / Data' },
  { symbol: 'RENDER/USDT', base: 'RENDER', quote: 'USDT', name: 'Render Network', category: 'AI / Data' },
  { symbol: 'TAO/USDT', base: 'TAO', quote: 'USDT', name: 'Bittensor', category: 'AI / Data' },
  { symbol: 'WLD/USDT', base: 'WLD', quote: 'USDT', name: 'Worldcoin', category: 'AI / Data' },
  { symbol: 'GRT/USDT', base: 'GRT', quote: 'USDT', name: 'The Graph', category: 'AI / Data' },

  // --- Layer 2s & Modular ---
  { symbol: 'ARB/USDT', base: 'ARB', quote: 'USDT', name: 'Arbitrum', category: 'Layer 2' },
  { symbol: 'OP/USDT', base: 'OP', quote: 'USDT', name: 'Optimism', category: 'Layer 2' },
  { symbol: 'POL/USDT', base: 'POL', quote: 'USDT', name: 'Polygon Ecosystem', category: 'Layer 2' },
  { symbol: 'TIA/USDT', base: 'TIA', quote: 'USDT', name: 'Celestia', category: 'Layer 2' },
  { symbol: 'MANTA/USDT', base: 'MANTA', quote: 'USDT', name: 'Manta Network', category: 'Layer 2' },

  // --- DeFi ---
  { symbol: 'LINK/USDT', base: 'LINK', quote: 'USDT', name: 'Chainlink', category: 'DeFi' },
  { symbol: 'AAVE/USDT', base: 'AAVE', quote: 'USDT', name: 'Aave', category: 'DeFi' },
  { symbol: 'UNI/USDT', base: 'UNI', quote: 'USDT', name: 'Uniswap', category: 'DeFi' },
  { symbol: 'INJ/USDT', base: 'INJ', quote: 'USDT', name: 'Injective', category: 'DeFi' },
  { symbol: 'JUP/USDT', base: 'JUP', quote: 'USDT', name: 'Jupiter', category: 'DeFi' },
  { symbol: 'PENDLE/USDT', base: 'PENDLE', quote: 'USDT', name: 'Pendle Finance', category: 'DeFi' },
  { symbol: 'ENA/USDT', base: 'ENA', quote: 'USDT', name: 'Ethena', category: 'DeFi' },
  { symbol: 'CRV/USDT', base: 'CRV', quote: 'USDT', name: 'Curve DAO', category: 'DeFi' },
  { symbol: 'MKR/USDT', base: 'MKR', quote: 'USDT', name: 'Maker', category: 'DeFi' },
  { symbol: 'LDO/USDT', base: 'LDO', quote: 'USDT', name: 'Lido DAO', category: 'DeFi' },
  { symbol: 'RUNE/USDT', base: 'RUNE', quote: 'USDT', name: 'THORChain', category: 'DeFi' },

  // --- Real World Assets (RWA) & Storage ---
  { symbol: 'ONDO/USDT', base: 'ONDO', quote: 'USDT', name: 'Ondo Finance', category: 'Infrastructure' },
  { symbol: 'FIL/USDT', base: 'FIL', quote: 'USDT', name: 'Filecoin', category: 'Infrastructure' },
  { symbol: 'PYTH/USDT', base: 'PYTH', quote: 'USDT', name: 'Pyth Network', category: 'Infrastructure' },
]

export function getCoinBySymbol(symbol: string): CoinInfo | undefined {
  return TOP_COINS.find((c) => c.symbol.toLowerCase() === symbol.toLowerCase())
}

export function isValidSymbol(symbol: string): boolean {
  return TOP_COINS.some((c) => c.symbol.toLowerCase() === symbol.toLowerCase())
}
