import { NextResponse } from 'next/server'
import { scanHotCoins } from '@/lib/data/scanner'

export const dynamic = 'force-dynamic'

/**
 * Returns real-time hot coins radar and breakout predictions across top 50+ coins.
 */
export async function GET() {
  try {
    const result = await scanHotCoins()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan hot coins' },
      { status: 500 },
    )
  }
}
