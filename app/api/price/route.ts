import { NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { fetchLastPrice } from '@/lib/data/binance'
import { fetchChainlinkEthUsd } from '@/lib/data/chainlink'

export const dynamic = 'force-dynamic'

/** Live price snapshot: Binance ticker + Chainlink oracle reading. */
export async function GET() {
  const [price, chainlink] = await Promise.all([
    fetchLastPrice().catch(() => null),
    fetchChainlinkEthUsd().catch(() => null),
  ])

  const divergencePct =
    price != null && chainlink != null && chainlink.price > 0
      ? Number((((price - chainlink.price) / chainlink.price) * 100).toFixed(3))
      : null

  return NextResponse.json({
    symbol: config.symbol,
    timeframe: config.timeframe,
    price,
    chainlink,
    divergencePct,
  })
}
