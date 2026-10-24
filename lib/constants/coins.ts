export type CoinInfo = {
  symbol: string
  base: string
  quote: string
  name: string
  category: 'Major' | 'Layer 1' | 'Layer 2' | 'DeFi' | 'Meme' | 'AI / Data' | 'Infrastructure' | 'Fan Token'
  default?: boolean
}

export const DEFAULT_SYMBOL = 'ETH/USDT'

/**
 * Top liquid spot trading pairs on Binance.
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
  { symbol: 'HBAR/USDT', base: 'HBAR', quote: 'USDT', name: 'Hedera', category: 'Layer 1' },
  { symbol: 'STX/USDT', base: 'STX', quote: 'USDT', name: 'Stacks', category: 'Layer 1' },
  { symbol: 'TON/USDT', base: 'TON', quote: 'USDT', name: 'Toncoin', category: 'Layer 1' },
  { symbol: 'TRX/USDT', base: 'TRX', quote: 'USDT', name: 'TRON', category: 'Layer 1' },
  { symbol: 'KAS/USDT', base: 'KAS', quote: 'USDT', name: 'Kaspa', category: 'Layer 1' },
  { symbol: 'RONIN/USDT', base: 'RONIN', quote: 'USDT', name: 'Ronin Network', category: 'Layer 1' },

  // --- Hot Memecoins & Breakout Cults ---
  { symbol: 'PENGU/USDT', base: 'PENGU', quote: 'USDT', name: 'Pudgy Penguins', category: 'Meme' },
  { symbol: 'MUBARAK/USDT', base: 'MUBARAK', quote: 'USDT', name: 'Mubarak', category: 'Meme' },
  { symbol: 'PEPE/USDT', base: 'PEPE', quote: 'USDT', name: 'Pepe', category: 'Meme' },
  { symbol: 'DOGE/USDT', base: 'DOGE', quote: 'USDT', name: 'Dogecoin', category: 'Meme' },
  { symbol: 'SHIB/USDT', base: 'SHIB', quote: 'USDT', name: 'Shiba Inu', category: 'Meme' },
  { symbol: 'WIF/USDT', base: 'WIF', quote: 'USDT', name: 'dogwifhat', category: 'Meme' },
  { symbol: 'BONK/USDT', base: 'BONK', quote: 'USDT', name: 'Bonk', category: 'Meme' },
  { symbol: 'FLOKI/USDT', base: 'FLOKI', quote: 'USDT', name: 'Floki', category: 'Meme' },
  { symbol: 'PNUT/USDT', base: 'PNUT', quote: 'USDT', name: 'Peanut the Squirrel', category: 'Meme' },
  { symbol: 'NEIRO/USDT', base: 'NEIRO', quote: 'USDT', name: 'First Neiro on Ethereum', category: 'Meme' },
  { symbol: 'ACT/USDT', base: 'ACT', quote: 'USDT', name: 'Act I : The AI Prophecy', category: 'Meme' },
  { symbol: 'GOAT/USDT', base: 'GOAT', quote: 'USDT', name: 'Goatseus Maximus', category: 'Meme' },
  { symbol: 'POPCAT/USDT', base: 'POPCAT', quote: 'USDT', name: 'Popcat', category: 'Meme' },
  { symbol: 'BRETT/USDT', base: 'BRETT', quote: 'USDT', name: 'Brett', category: 'Meme' },
  { symbol: 'BOME/USDT', base: 'BOME', quote: 'USDT', name: 'BOOK OF MEME', category: 'Meme' },
  { symbol: '1000SATS/USDT', base: '1000SATS', quote: 'USDT', name: '1000SATS Ordinals', category: 'Meme' },
  { symbol: 'ORDI/USDT', base: 'ORDI', quote: 'USDT', name: 'Ordinals', category: 'Meme' },
  { symbol: 'TURBO/USDT', base: 'TURBO', quote: 'USDT', name: 'Turbo', category: 'Meme' },
  { symbol: 'MEME/USDT', base: 'MEME', quote: 'USDT', name: 'Memecoin', category: 'Meme' },
  { symbol: 'PEOPLE/USDT', base: 'PEOPLE', quote: 'USDT', name: 'ConstitutionDAO', category: 'Meme' },
  { symbol: 'MOODENG/USDT', base: 'MOODENG', quote: 'USDT', name: 'Moo Deng', category: 'Meme' },
  { symbol: 'NOT/USDT', base: 'NOT', quote: 'USDT', name: 'Notcoin', category: 'Meme' },
  { symbol: 'DOGS/USDT', base: 'DOGS', quote: 'USDT', name: 'Dogs', category: 'Meme' },
  { symbol: 'CATI/USDT', base: 'CATI', quote: 'USDT', name: 'Catizen', category: 'Meme' },
  { symbol: 'HMSTR/USDT', base: 'HMSTR', quote: 'USDT', name: 'Hamster Kombat', category: 'Meme' },

  // --- Fan Tokens & High Volatility Sports ---
  { symbol: 'ALPINE/USDT', base: 'ALPINE', quote: 'USDT', name: 'Alpine F1 Team', category: 'Fan Token' },
  { symbol: 'SANTOS/USDT', base: 'SANTOS', quote: 'USDT', name: 'Santos FC Fan Token', category: 'Fan Token' },
  { symbol: 'PORTO/USDT', base: 'PORTO', quote: 'USDT', name: 'FC Porto Fan Token', category: 'Fan Token' },
  { symbol: 'BAR/USDT', base: 'BAR', quote: 'USDT', name: 'FC Barcelona Fan Token', category: 'Fan Token' },
  { symbol: 'CHZ/USDT', base: 'CHZ', quote: 'USDT', name: 'Chiliz', category: 'Fan Token' },

  // --- AI & DePIN & Compute ---
  { symbol: 'FET/USDT', base: 'FET', quote: 'USDT', name: 'Artificial Superintelligence Alliance', category: 'AI / Data' },
  { symbol: 'RENDER/USDT', base: 'RENDER', quote: 'USDT', name: 'Render Network', category: 'AI / Data' },
  { symbol: 'TAO/USDT', base: 'TAO', quote: 'USDT', name: 'Bittensor', category: 'AI / Data' },
  { symbol: 'WLD/USDT', base: 'WLD', quote: 'USDT', name: 'Worldcoin', category: 'AI / Data' },
  { symbol: 'GRT/USDT', base: 'GRT', quote: 'USDT', name: 'The Graph', category: 'AI / Data' },
  { symbol: 'IO/USDT', base: 'IO', quote: 'USDT', name: 'io.net Cloud AI', category: 'AI / Data' },
  { symbol: 'ATH/USDT', base: 'ATH', quote: 'USDT', name: 'Aethir Cloud', category: 'AI / Data' },
  { symbol: 'ARKM/USDT', base: 'ARKM', quote: 'USDT', name: 'Arkham Intelligence', category: 'AI / Data' },
  { symbol: 'AI/USDT', base: 'AI', quote: 'USDT', name: 'Sleepless AI', category: 'AI / Data' },
  { symbol: 'AKT/USDT', base: 'AKT', quote: 'USDT', name: 'Akash Network', category: 'AI / Data' },
  { symbol: 'GALA/USDT', base: 'GALA', quote: 'USDT', name: 'Gala Games', category: 'AI / Data' },
  { symbol: 'IMX/USDT', base: 'IMX', quote: 'USDT', name: 'Immutable X', category: 'AI / Data' },

  // --- Layer 2s & Modular ---
  { symbol: 'ARB/USDT', base: 'ARB', quote: 'USDT', name: 'Arbitrum', category: 'Layer 2' },
  { symbol: 'OP/USDT', base: 'OP', quote: 'USDT', name: 'Optimism', category: 'Layer 2' },
  { symbol: 'POL/USDT', base: 'POL', quote: 'USDT', name: 'Polygon Ecosystem', category: 'Layer 2' },
  { symbol: 'TIA/USDT', base: 'TIA', quote: 'USDT', name: 'Celestia', category: 'Layer 2' },
  { symbol: 'MANTA/USDT', base: 'MANTA', quote: 'USDT', name: 'Manta Network', category: 'Layer 2' },
  { symbol: 'ZRO/USDT', base: 'ZRO', quote: 'USDT', name: 'LayerZero', category: 'Layer 2' },
  { symbol: 'BLUR/USDT', base: 'BLUR', quote: 'USDT', name: 'Blur', category: 'Layer 2' },

  // --- High-Beta DeFi & DEX ---
  { symbol: 'THE/USDT', base: 'THE', quote: 'USDT', name: 'THENA', category: 'DeFi' },
  { symbol: 'LINK/USDT', base: 'LINK', quote: 'USDT', name: 'Chainlink', category: 'DeFi' },
  { symbol: 'AAVE/USDT', base: 'AAVE', quote: 'USDT', name: 'Aave', category: 'DeFi' },
  { symbol: 'UNI/USDT', base: 'UNI', quote: 'USDT', name: 'Uniswap', category: 'DeFi' },
  { symbol: 'INJ/USDT', base: 'INJ', quote: 'USDT', name: 'Injective', category: 'DeFi' },
  { symbol: 'JUP/USDT', base: 'JUP', quote: 'USDT', name: 'Jupiter', category: 'DeFi' },
  { symbol: 'RAY/USDT', base: 'RAY', quote: 'USDT', name: 'Raydium', category: 'DeFi' },
  { symbol: 'DRIFT/USDT', base: 'DRIFT', quote: 'USDT', name: 'Drift Protocol', category: 'DeFi' },
  { symbol: 'COW/USDT', base: 'COW', quote: 'USDT', name: 'CoW Protocol', category: 'DeFi' },
  { symbol: 'PENDLE/USDT', base: 'PENDLE', quote: 'USDT', name: 'Pendle Finance', category: 'DeFi' },
  { symbol: 'ENA/USDT', base: 'ENA', quote: 'USDT', name: 'Ethena', category: 'DeFi' },
  { symbol: 'DYDX/USDT', base: 'DYDX', quote: 'USDT', name: 'dYdX', category: 'DeFi' },
  { symbol: 'CRV/USDT', base: 'CRV', quote: 'USDT', name: 'Curve DAO', category: 'DeFi' },
  { symbol: 'SKY/USDT', base: 'SKY', quote: 'USDT', name: 'Sky (formerly MakerDAO)', category: 'DeFi' },
  { symbol: 'LDO/USDT', base: 'LDO', quote: 'USDT', name: 'Lido DAO', category: 'DeFi' },
  { symbol: 'RUNE/USDT', base: 'RUNE', quote: 'USDT', name: 'THORChain', category: 'DeFi' },
  { symbol: 'CAKE/USDT', base: 'CAKE', quote: 'USDT', name: 'PancakeSwap', category: 'DeFi' },
  { symbol: 'LA/USDT', base: 'LA', quote: 'USDT', name: 'LATOKEN', category: 'DeFi' },
  { symbol: 'HAEDAL/USDT', base: 'HAEDAL', quote: 'USDT', name: 'Haedal Protocol', category: 'DeFi' },
  { symbol: 'PUNDIX/USDT', base: 'PUNDIX', quote: 'USDT', name: 'Pundi X', category: 'DeFi' },
  { symbol: 'HUMA/USDT', base: 'HUMA', quote: 'USDT', name: 'Huma Finance', category: 'DeFi' },
  { symbol: 'SPK/USDT', base: 'SPK', quote: 'USDT', name: 'Spark Protocol', category: 'DeFi' },
  { symbol: 'RESOLV/USDT', base: 'RESOLV', quote: 'USDT', name: 'Resolv Protocol', category: 'DeFi' },

  // --- Real World Assets (RWA) & Storage & Infrastructure ---
  { symbol: 'ONDO/USDT', base: 'ONDO', quote: 'USDT', name: 'Ondo Finance', category: 'Infrastructure' },
  { symbol: 'FIL/USDT', base: 'FIL', quote: 'USDT', name: 'Filecoin', category: 'Infrastructure' },
  { symbol: 'PYTH/USDT', base: 'PYTH', quote: 'USDT', name: 'Pyth Network', category: 'Infrastructure' },
  { symbol: 'AVA/USDT', base: 'AVA', quote: 'USDT', name: 'AVA Foundation', category: 'Infrastructure' },
  { symbol: 'KERNEL/USDT', base: 'KERNEL', quote: 'USDT', name: 'Kernel Protocol', category: 'Infrastructure' },
  { symbol: 'OPEN/USDT', base: 'OPEN', quote: 'USDT', name: 'Open Loot', category: 'Infrastructure' },
  { symbol: 'PROVE/USDT', base: 'PROVE', quote: 'USDT', name: 'Succinct Prove', category: 'Infrastructure' },

  // --- Emerging Breakouts, AI & Memes ---
  { symbol: 'INIT/USDT', base: 'INIT', quote: 'USDT', name: 'Initia', category: 'Layer 1' },
  { symbol: 'LAYER/USDT', base: 'LAYER', quote: 'USDT', name: 'Solayer', category: 'Layer 1' },
  { symbol: 'ASTER/USDT', base: 'ASTER', quote: 'USDT', name: 'Aster Network', category: 'Layer 2' },
  { symbol: 'AVNT/USDT', base: 'AVNT', quote: 'USDT', name: 'Aventus', category: 'Layer 2' },
  { symbol: 'BARD/USDT', base: 'BARD', quote: 'USDT', name: 'Bard AI', category: 'AI / Data' },
  { symbol: 'SAHARA/USDT', base: 'SAHARA', quote: 'USDT', name: 'Sahara AI', category: 'AI / Data' },
  { symbol: 'SXT/USDT', base: 'SXT', quote: 'USDT', name: 'Space and Time', category: 'AI / Data' },
  { symbol: '1MBABYDOGE/USDT', base: '1MBABYDOGE', quote: 'USDT', name: 'Baby Doge Coin', category: 'Meme' },
  { symbol: 'GIGGLE/USDT', base: 'GIGGLE', quote: 'USDT', name: 'Giggle Academy', category: 'Meme' },
  { symbol: 'PUMP/USDT', base: 'PUMP', quote: 'USDT', name: 'Pump.fun', category: 'Meme' },
  { symbol: 'TRUMP/USDT', base: 'TRUMP', quote: 'USDT', name: 'Official Trump', category: 'Meme' },
  { symbol: 'VIRTUAL/USDT', base: 'VIRTUAL', quote: 'USDT', name: 'Virtuals Protocol', category: 'AI / Data' },
  { symbol: 'AIXBT/USDT', base: 'AIXBT', quote: 'USDT', name: 'aixbt AI Agent', category: 'AI / Data' },

  // --- High-Beta Liquid Restaking & Next-Gen DeFi ---
  { symbol: 'AERO/USDT', base: 'AERO', quote: 'USDT', name: 'Aerodrome Finance', category: 'DeFi' },
  { symbol: 'EIGEN/USDT', base: 'EIGEN', quote: 'USDT', name: 'EigenLayer', category: 'DeFi' },
  { symbol: 'ETHFI/USDT', base: 'ETHFI', quote: 'USDT', name: 'Ether.fi', category: 'DeFi' },
  { symbol: 'REZ/USDT', base: 'REZ', quote: 'USDT', name: 'Renzo Protocol', category: 'DeFi' },
  { symbol: 'JTO/USDT', base: 'JTO', quote: 'USDT', name: 'Jito', category: 'DeFi' },
  { symbol: 'WLFI/USDT', base: 'WLFI', quote: 'USDT', name: 'World Liberty Financial', category: 'DeFi' },

  // --- Next-Gen Layer 1s, Layer 2s & Privacy ---
  { symbol: 'STRK/USDT', base: 'STRK', quote: 'USDT', name: 'Starknet', category: 'Layer 2' },
  { symbol: 'W/USDT', base: 'W', quote: 'USDT', name: 'Wormhole', category: 'Infrastructure' },
  { symbol: 'DYM/USDT', base: 'DYM', quote: 'USDT', name: 'Dymension', category: 'Layer 2' },
  { symbol: 'ALT/USDT', base: 'ALT', quote: 'USDT', name: 'AltLayer', category: 'Layer 2' },
  { symbol: 'ERA/USDT', base: 'ERA', quote: 'USDT', name: 'zkSync Era', category: 'Layer 2' },
  { symbol: 'SOPH/USDT', base: 'SOPH', quote: 'USDT', name: 'Sophon', category: 'Layer 2' },
  { symbol: 'COTI/USDT', base: 'COTI', quote: 'USDT', name: 'COTI', category: 'Layer 2' },
  { symbol: 'ZAMA/USDT', base: 'ZAMA', quote: 'USDT', name: 'Zama FHE Privacy', category: 'Layer 2' },
  { symbol: 'ZEC/USDT', base: 'ZEC', quote: 'USDT', name: 'Zcash', category: 'Major' },
  { symbol: 'XLM/USDT', base: 'XLM', quote: 'USDT', name: 'Stellar', category: 'Layer 1' },
  { symbol: 'DASH/USDT', base: 'DASH', quote: 'USDT', name: 'Dash', category: 'Layer 1' },
  { symbol: 'QNT/USDT', base: 'QNT', quote: 'USDT', name: 'Quant Network', category: 'Infrastructure' },
]

export const SYMBOL_ALIASES: Record<string, string> = {
  'HEADAL/USDT': 'HAEDAL/USDT',
  'IMBABY/USDT': '1MBABYDOGE/USDT',
  'BABY/USDT': '1MBABYDOGE/USDT',
  'SAHARAPUNDIX/USDT': 'SAHARA/USDT',
}

export function normalizeSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase()
  return SYMBOL_ALIASES[upper] ?? upper
}

export function getCoinBySymbol(symbol: string): CoinInfo | undefined {
  const norm = normalizeSymbol(symbol).toLowerCase()
  return TOP_COINS.find((c) => c.symbol.toLowerCase() === norm)
}

export function isValidSymbol(symbol: string): boolean {
  const norm = normalizeSymbol(symbol).toLowerCase()
  return TOP_COINS.some((c) => c.symbol.toLowerCase() === norm)
}
