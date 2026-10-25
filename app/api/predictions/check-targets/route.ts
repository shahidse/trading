import { NextResponse } from 'next/server'
import { checkAndPublishMetSquarePredictions } from '@/lib/notify/binance-square'
import { getSquarePostedPredictions } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const checkResult = await checkAndPublishMetSquarePredictions()
    const history = getSquarePostedPredictions(20)

    return NextResponse.json({
      success: true,
      check: checkResult,
      tracked: history,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check target milestones',
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
