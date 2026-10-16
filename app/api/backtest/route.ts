import { NextResponse } from 'next/server'
import { runBacktest } from '@/lib/backtest/replay'
import { config } from '@/lib/config'
import { fetchCandles } from '@/lib/data/binance'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Backtest the strategy over recent candles. `?limit=1000` */
export async function GET(request: Request) {
  const limitParam = new URL(request.url).searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitParam ?? 1000) || 1000, 200), 5000)

  try {
    const candles = await fetchCandles(config.symbol, config.timeframe, limit)
    const result = runBacktest(candles)
    return NextResponse.json({
      ...result,
      // The full trade list can be large — cap what goes over the wire.
      trades: result.trades.slice(-200),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backtest failed' },
      { status: 500 },
    )
  }
}
