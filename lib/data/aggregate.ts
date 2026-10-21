import { config } from '@/lib/config'
import type { Candle } from '@/lib/types'
import { round } from '@/lib/utils'
import { fetchCandles, fetchLastPrice } from './binance'
import { fetchChainlinkEthUsd, type ChainlinkPrice } from './chainlink'

export type MarketSnapshot = {
  symbol: string
  timeframe: string
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

  const [candles, macroCandles, price, chainlink] = await Promise.all([
    fetchCandles(symbol, timeframe, limit),
    fetchMacro ? fetchCandles(symbol, '1h', 100).catch(() => []) : Promise.resolve([]),
    fetchLastPrice(symbol),
    fetchChainlinkEthUsd().catch(() => null),
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
    candles,
    macroCandles: macroCandles.length > 0 ? macroCandles : undefined,
    price,
    chainlink,
    divergencePct,
  }
}
