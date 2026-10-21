import { NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { fetchOrderBook } from '@/lib/data/binance'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') ?? config.symbol
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 15), 5), 50)
    const book = await fetchOrderBook(symbol, limit)

    return NextResponse.json(book)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order book' },
      { status: 500 },
    )
  }
}
