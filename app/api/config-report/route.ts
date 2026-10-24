import { NextResponse } from 'next/server'
import { generateConfigReport } from '@/lib/exchange/config-report'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/config-report
 *
 * Returns a comprehensive execution readiness diagnostic report:
 * 1. Active blockers and reasons stopping orders from executing.
 * 2. Guard status for both Primary Strategy and Hot Coins Auto-Trading.
 * 3. Daily loss and trade count limit meters (% reached, remaining).
 * 4. Trading breakdown: Hot Coins vs Primary/Other coins (volume, trades, P&L, win rate).
 * 5. Recent guard refusals audit trail.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const symbol = url.searchParams.get('symbol') ?? config.symbol
    const report = generateConfigReport(symbol)

    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate config diagnostic report' },
      { status: 500 },
    )
  }
}
