export type ExecutionVenue = 'binance' | 'hyperliquid' | 'solana'

export interface VenueInfo {
  id: ExecutionVenue
  name: string
  shortName: string
  type: 'cex' | 'dex'
  custody: 'custodial' | 'non-custodial'
  authType: 'api-key' | 'agent-wallet' | 'web3-wallet'
  defaultSymbol: string
  description: string
  tag: string
  isDefault?: boolean
}

export const EXECUTION_VENUES: Record<ExecutionVenue, VenueInfo> = {
  binance: {
    id: 'binance',
    name: 'Binance Spot',
    shortName: 'Binance',
    type: 'cex',
    custody: 'custodial',
    authType: 'api-key',
    defaultSymbol: 'ETH/USDT',
    description: 'High-liquidity centralized spot orderbook (API Key + Secret)',
    tag: 'Default',
    isDefault: true,
  },
  hyperliquid: {
    id: 'hyperliquid',
    name: 'Hyperliquid L1 DEX',
    shortName: 'Hyperliquid',
    type: 'dex',
    custody: 'non-custodial',
    authType: 'agent-wallet',
    defaultSymbol: 'ETH/USDC',
    description: 'Non-custodial on-chain orderbook with delegated Agent Wallet (Zero withdrawal risk)',
    tag: 'Agent Wallet',
    isDefault: false,
  },
  solana: {
    id: 'solana',
    name: 'Solana DEX (Jupiter)',
    shortName: 'Solana (Jupiter)',
    type: 'dex',
    custody: 'non-custodial',
    authType: 'web3-wallet',
    defaultSymbol: 'SOL/USDC',
    description: 'Direct on-chain AMM & orderbook swap aggregator via Phantom / Solflare wallet',
    tag: 'Phantom / Solflare',
    isDefault: false,
  },
}

export const DEFAULT_VENUE: ExecutionVenue = 'binance'
