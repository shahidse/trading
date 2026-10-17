import { binance, type Exchange, type OHLCV } from 'ccxt'
import { config } from '@/lib/config'
import type { Candle } from '@/lib/types'

import { kraken } from 'ccxt'

let client: Exchange | null = null
let fallbackExchange: Exchange | null = null

function getClient(): Exchange {
  if (!client) {
    client = new binance({
      enableRateLimit: true,
      options: { defaultType: 'spot' },
      urls: {
        api: {
          public: 'https://data-api.binance.vision/api/v3',
        },
      },
      ...(process.env.BINANCE_API_KEY ? { apiKey: process.env.BINANCE_API_KEY } : {}),
      ...(process.env.BINANCE_SECRET ? { secret: process.env.BINANCE_SECRET } : {}),
    })
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
  try {
    const exchange = getClient()

    if (limit <= MAX_PER_REQUEST) {
      return toCandles(await exchange.fetchOHLCV(symbol, timeframe, undefined, limit))
    }

    const step = timeframeMs(exchange, timeframe)
    const collected = new Map<number, OHLCV>()
    let since = Date.now() - limit * step

    while (collected.size < limit) {
      const batch: OHLCV[] = await exchange.fetchOHLCV(symbol, timeframe, since, MAX_PER_REQUEST)
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
      const candles = await fallback.fetchOHLCV(symbol, timeframe, undefined, Math.min(limit, 720))
      return toCandles(candles)
    }
    throw error
  }
}

/** Latest traded price for the configured market. */
export async function fetchLastPrice(symbol: string = config.symbol): Promise<number> {
  try {
    const exchange = getClient()
    const ticker = await exchange.fetchTicker(symbol)
    const price = ticker.last ?? ticker.close

    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error(`No price available for ${symbol}`)
    }
    return price
  } catch (error) {
    if (isGeoBlocked(error)) {
      console.warn('Binance geo-restricted (451). Falling back to Kraken ticker...')
      const fallback = getFallbackExchange()
      const ticker = await fallback.fetchTicker(symbol)
      const price = ticker.last ?? ticker.close
      if (typeof price !== 'number' || !Number.isFinite(price)) {
        throw new Error(`No price available for ${symbol} on fallback exchange`)
      }
      return price
    }
    throw error
  }
}
