import { NextRequest, NextResponse } from 'next/server'
import { getFutureCoinPredictions } from '@/lib/data/predictions'
import { getSquarePostedPredictions } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

/**
 * Returns multi-day future coin predictions, price targets, and catalyst analysis.
 *
 * Query params:
 * - horizon: 'all' | '24H' | '3_DAYS' | '7_DAYS'
 * - category: 'all' | 'Major' | 'Layer 1' | 'Meme' | 'AI / Data' | etc.
 * - limit: number (default all)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const horizon = searchParams.get('horizon')?.toUpperCase()
    const category = searchParams.get('category')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined

    const data = await getFutureCoinPredictions()

    let filtered = data.predictions

    if (horizon && horizon !== 'ALL') {
      filtered = filtered.filter((p) => p.horizon === horizon)
    }

    if (category && category !== 'all' && category !== 'ALL') {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    }

    if (limit && Number.isFinite(limit) && limit > 0) {
      filtered = filtered.slice(0, limit)
    }

    const trackedSquare = getSquarePostedPredictions(20)

    return NextResponse.json({
      ...data,
      predictions: filtered,
      trackedSquarePredictions: trackedSquare,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate future coin predictions' },
      { status: 500 }
    )
  }
}
