import { NextResponse } from 'next/server'
import { TOP_COINS, DEFAULT_SYMBOL } from '@/lib/constants/coins'
import { fetchMultipleTickers } from '@/lib/data/binance'

export const dynamic = 'force-dynamic'

/**
 * Returns the list of top 50 tradeable coins.
 * Fetches mini 24h ticker prices from Binance for quick display.
 */
export async function GET() {
  try {
    const symbolsToFetch = TOP_COINS.map((c) => c.symbol)
    const tickers = await fetchMultipleTickers(symbolsToFetch)

    const coins = TOP_COINS.map((c) => ({
      ...c,
      price: tickers[c.symbol]?.price ?? null,
      change24h: tickers[c.symbol]?.change24h ?? null,
    }))

    return NextResponse.json({
      defaultSymbol: DEFAULT_SYMBOL,
      coins,
    })
  } catch {
    return NextResponse.json(
      { defaultSymbol: DEFAULT_SYMBOL, coins: TOP_COINS },
      { status: 200 },
    )
  }
}
