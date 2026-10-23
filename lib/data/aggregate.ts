import { config } from '@/lib/config'
import type { Candle } from '@/lib/types'
import { round } from '@/lib/utils'
import { fetchCandles, fetchLastPrice } from './binance'
import { fetchChainlinkEthUsd, type ChainlinkPrice } from './chainlink'

export type MarketSnapshot = {
  symbol: string
  timeframe: string
  macroTimeframe: string
  candles: Candle[]
  macroCandles?: Candle[]
  /** Exchange last price (Binance). */
  price: number
  /** Chainlink oracle reading, or null when unavailable. */
  chainlink: ChainlinkPrice | null
  /** Percentage gap between exchange and oracle price. */
  divergencePct: number | null
}

export type SnapshotOptions = {
  symbol?: string
  timeframe?: string
  limit?: number
  fetchMacro?: boolean
}

/** Determine higher-timeframe anchor for any trading timeframe. */
export function getMacroTimeframe(primaryTimeframe: string): string {
  switch (primaryTimeframe) {
    case '1m':
    case '3m':
    case '5m':
      return '15m'
    case '15m':
    case '30m':
      return '1h'
    case '1h':
    case '2h':
      return '4h'
    case '4h':
      return '1d'
    case '1d':
      return '1w'
    default:
      return '1h'
  }
}

/**
 * Aggregate market data for one analysis run.
 *
 * The exchange feed is required; the Chainlink oracle is best-effort and its
 * failure degrades gracefully to `chainlink: null` / `divergencePct: null`.
 */
export async function getMarketSnapshot(options: SnapshotOptions = {}): Promise<MarketSnapshot> {
  const symbol = options.symbol ?? config.symbol
  const timeframe = options.timeframe ?? config.timeframe
  const limit = options.limit ?? config.candleLimit
  const fetchMacro = options.fetchMacro ?? true
  const macroTimeframe = getMacroTimeframe(timeframe)

  const [candles, macroCandles, price, chainlink] = await Promise.all([
    fetchCandles(symbol, timeframe, limit),
    fetchMacro ? fetchCandles(symbol, macroTimeframe, 220).catch(() => []) : Promise.resolve([]),
    fetchLastPrice(symbol),
    symbol === 'ETH/USDT' ? fetchChainlinkEthUsd().catch(() => null) : Promise.resolve(null),
  ])

  if (candles.length === 0) {
    throw new Error(`No candles returned for ${symbol} ${timeframe}`)
  }

  const divergencePct =
    chainlink && chainlink.price > 0
      ? round(((price - chainlink.price) / chainlink.price) * 100, 3)
      : null

  return {
    symbol,
    timeframe,
    macroTimeframe,
    candles,
    macroCandles: macroCandles.length > 0 ? macroCandles : undefined,
    price,
    chainlink,
    divergencePct,
  }
}
