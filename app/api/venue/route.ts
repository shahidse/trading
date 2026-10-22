import { NextResponse } from 'next/server'
import { DEFAULT_VENUE, EXECUTION_VENUES, type ExecutionVenue } from '@/lib/constants/venues'
import { getSetting, setSetting } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

const VENUE_SETTING_KEY = 'active_execution_venue'

export async function GET() {
  try {
    let activeVenue: ExecutionVenue = DEFAULT_VENUE
    try {
      const stored = getSetting(VENUE_SETTING_KEY)
      if (stored && (stored === 'binance' || stored === 'hyperliquid' || stored === 'solana')) {
        activeVenue = stored as ExecutionVenue
      }
    } catch {
      // Stateless fallback
    }

    return NextResponse.json({
      activeVenue,
      venues: EXECUTION_VENUES,
      isDefault: activeVenue === DEFAULT_VENUE,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { venue } = body

    if (venue !== 'binance' && venue !== 'hyperliquid' && venue !== 'solana') {
      return NextResponse.json(
        { error: 'Invalid venue. Must be binance, hyperliquid, or solana.' },
        { status: 400 }
      )
    }

    try {
      setSetting(VENUE_SETTING_KEY, venue)
    } catch (err) {
      console.warn('[venue] DB persist skipped (stateless mode):', err)
    }

    return NextResponse.json({
      success: true,
      activeVenue: venue,
      venueInfo: EXECUTION_VENUES[venue as ExecutionVenue],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
