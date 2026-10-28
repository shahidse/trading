import { binance, type Exchange, type OHLCV, kraken } from 'ccxt'
import { config } from '@/lib/config'
import type { Candle } from '@/lib/types'
import { normalizeSymbol } from '@/lib/constants/coins'

let client: Exchange | null = null
let fallbackExchange: Exchange | null = null

function getClient(): Exchange {
  if (!client) {
    client = new binance({
      enableRateLimit: true,
      options: { defaultType: 'spot', fetchMarkets: ['spot'], fetchCurrencies: false },
      urls: {
        api: {
          public: 'https://data-api.binance.vision/api/v3',
        },
      },
    })
    const proxy = process.env.BINANCE_PROXY_URL ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY
    if (proxy) {
      client.httpsProxy = proxy
    }
  }
  return client
}

function getFallbackExchange(): Exchange {
  if (!fallbackExchange) {
    fallbackExchange = new kraken({
      enableRateLimit: true,
    })
  }
  return fallbackExchange
}

/** Binance caps a single klines request at 1000 bars. */
const MAX_PER_REQUEST = 1000

function toCandles(rows: OHLCV[]): Candle[] {
  return rows.map((row) => ({
    time: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5] ?? 0),
  }))
}

function timeframeMs(exchange: Exchange, timeframe: string): number {
  const seconds = Number(exchange.parseTimeframe(timeframe))
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 900) * 1000
}

/**
 * Fetch OHLCV candles (oldest → newest) for the configured market.
 *
 * Binance silently caps a single request at 1000 candles, so anything larger is
 * paginated forward from the earliest bar we need. Without this, backtests
 * asking for 5000 candles would quietly run on 1000.
 */
function isGeoBlocked(err: unknown): boolean {
  if (!err) return false
  const msg = String((err as Error)?.message || err).toLowerCase()
  return msg.includes('451') || msg.includes('restricted location') || msg.includes('unavailable for legal reasons')
}

export async function fetchCandles(
  symbol: string = config.symbol,
  timeframe: string = config.timeframe,
  limit: number = config.candleLimit,
): Promise<Candle[]> {
  const normSymbol = normalizeSymbol(symbol)
  try {
    const exchange = getClient()

    if (limit <= MAX_PER_REQUEST) {
      return toCandles(await exchange.fetchOHLCV(normSymbol, timeframe, undefined, limit))
    }

    const step = timeframeMs(exchange, timeframe)
    const collected = new Map<number, OHLCV>()
    let since = Date.now() - limit * step

    while (collected.size < limit) {
      const batch: OHLCV[] = await exchange.fetchOHLCV(normSymbol, timeframe, since, MAX_PER_REQUEST)
      if (batch.length === 0) break

      for (const row of batch) collected.set(Number(row[0]), row)

      const lastTime = Number(batch[batch.length - 1][0])
      const next = lastTime + step
      if (next <= since) break // no forward progress — bail out
      since = next
      if (since > Date.now()) break
    }

    return toCandles(
      Array.from(collected.values())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .slice(-limit),
    )
  } catch (error) {
    if (isGeoBlocked(error)) {
      console.warn('Binance geo-restricted (451). Falling back to Kraken market data...')
      const fallback = getFallbackExchange()
      const candles = await fallback.fetchOHLCV(normSymbol, timeframe, undefined, Math.min(limit, 720))
      return toCandles(candles)
    }
    throw error
  }
}

/** Latest traded price for the configured market. */
export async function fetchLastPrice(symbol: string = config.symbol): Promise<number> {
  const normSymbol = normalizeSymbol(symbol)
  try {
    const exchange = getClient()
    const ticker = await exchange.fetchTicker(normSymbol)
    const price = ticker.last ?? ticker.close

    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error(`No price available for ${symbol}`)
    }
    return price
  } catch (error) {
    if (isGeoBlocked(error)) {
      console.warn('Binance geo-restricted (451). Falling back to Kraken ticker...')
      const fallback = getFallbackExchange()
      const ticker = await fallback.fetchTicker(normSymbol)
      const price = ticker.last ?? ticker.close
      if (typeof price !== 'number' || !Number.isFinite(price)) {
        throw new Error(`No price available for ${symbol} on fallback exchange`)
      }
      return price
    }
    throw error
  }
}

export type OrderBookEntry = { price: number; quantity: number }

export type OrderBookSnapshot = {
  symbol: string
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  spread: number
  spreadPct: number
  midPrice: number
  timestamp: number
}

/** Fetch top bids, asks, and depth from the order book. */
export async function fetchOrderBook(
  symbol: string = config.symbol,
  limit = 15,
): Promise<OrderBookSnapshot> {
  const normSymbol = normalizeSymbol(symbol)
  try {
    const exchange = getClient()
    const book = await exchange.fetchOrderBook(normSymbol, limit)

    const bids: OrderBookEntry[] = (book.bids || []).slice(0, limit).map(([p, q]) => ({
      price: Number(p),
      quantity: Number(q),
    }))
    const asks: OrderBookEntry[] = (book.asks || []).slice(0, limit).map(([p, q]) => ({
      price: Number(p),
      quantity: Number(q),
    }))

    const bestBid = bids[0]?.price ?? 0
    const bestAsk = asks[0]?.price ?? 0
    const spread = bestAsk > bestBid ? bestAsk - bestBid : 0
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk
    const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0

    return {
      symbol,
      bids,
      asks,
      spread: Number(spread.toFixed(2)),
      spreadPct: Number(spreadPct.toFixed(4)),
      midPrice: Number(midPrice.toFixed(2)),
      timestamp: book.timestamp ?? Date.now(),
    }
  } catch (error) {
    if (isGeoBlocked(error)) {
      const fallback = getFallbackExchange()
      const book = await fallback.fetchOrderBook(symbol, limit)
      const bids: OrderBookEntry[] = (book.bids || []).slice(0, limit).map(([p, q]) => ({
        price: Number(p),
        quantity: Number(q),
      }))
      const asks: OrderBookEntry[] = (book.asks || []).slice(0, limit).map(([p, q]) => ({
        price: Number(p),
        quantity: Number(q),
      }))
      const bestBid = bids[0]?.price ?? 0
      const bestAsk = asks[0]?.price ?? 0
      const spread = bestAsk > bestBid ? bestAsk - bestBid : 0
      const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk
      const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0

      return {
        symbol,
        bids,
        asks,
        spread: Number(spread.toFixed(2)),
        spreadPct: Number(spreadPct.toFixed(4)),
        midPrice: Number(midPrice.toFixed(2)),
        timestamp: book.timestamp ?? Date.now(),
      }
    }
    throw error
  }
}

export type MiniTicker = {
  price: number
  change24h: number
  quoteVolume?: number
  high?: number
  low?: number
}

/** Fetch multiple coin tickers in batch. */
export async function fetchMultipleTickers(symbols: string[]): Promise<Record<string, MiniTicker>> {
  const exchange = getClient()
  const normalizedSymbols = symbols.map((s) => normalizeSymbol(s))
  try {
    let raw: Record<string, any>
    try {
      raw = await exchange.fetchTickers(normalizedSymbols)
    } catch {
      // If a BadSymbol error happened or markets weren't loaded, load markets and filter
      try {
        await exchange.loadMarkets()
        const markets = exchange.markets ?? {}
        const validSymbols = normalizedSymbols.filter((s) => s in markets)
        raw = validSymbols.length > 0 ? await exchange.fetchTickers(validSymbols) : await exchange.fetchTickers()
      } catch {
        raw = await exchange.fetchTickers()
      }
    }

    const result: Record<string, MiniTicker> = {}
    for (const [sym, t] of Object.entries(raw)) {
      if (t) {
        result[sym] = {
          price: Number(t.last ?? t.close ?? 0),
          change24h: Number(t.percentage ?? 0),
          quoteVolume: Number(t.quoteVolume ?? 0),
          high: Number(t.high ?? 0),
          low: Number(t.low ?? 0),
        }
      }
    }
    return result
  } catch (error) {
    if (isGeoBlocked(error)) {
      try {
        const fallback = getFallbackExchange()
        await fallback.loadMarkets()
        const fallbackMarkets = fallback.markets ?? {}
        const validFallback = symbols.filter((s) => s in fallbackMarkets)
        const raw = await fallback.fetchTickers(validFallback)
        const result: Record<string, MiniTicker> = {}
        for (const [sym, t] of Object.entries(raw)) {
          if (t) {
            result[sym] = {
              price: Number(t.last ?? t.close ?? 0),
              change24h: Number(t.percentage ?? 0),
              quoteVolume: Number(t.quoteVolume ?? 0),
              high: Number(t.high ?? 0),
              low: Number(t.low ?? 0),
            }
          }
        }
        return result
      } catch {
        return {}
      }
    }
    return {}
  }
}

