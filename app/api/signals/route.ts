import { NextResponse } from 'next/server'
import { getRecentSignals } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

/** Recent persisted signals, newest first. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const limitParam = url.searchParams.get('limit')
  const symbol = url.searchParams.get('symbol') ?? undefined
  const limit = Math.min(Math.max(Number(limitParam ?? 50) || 50, 1), 500)

  try {
    return NextResponse.json({ signals: getRecentSignals(limit, symbol) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read signals' },
      { status: 500 },
    )
  }
}
