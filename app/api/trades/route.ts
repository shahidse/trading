import { NextResponse } from 'next/server'
import { getOpenBuyPosition, getRecentTradeOrders, realisedPnlSince } from '@/lib/db/client'
import { config } from '@/lib/config'
import {
  getExchangeSettings,
  publicExchangeSettings,
  saveExchangeSettings,
  type ExchangeSettings,
} from '@/lib/exchange/settings'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Trading configuration and audit log.
 *
 * GET   — effective settings (credentials masked), recent orders, open position,
 *         and realised P&L over the last 24h (which drives the loss guard).
 * PUT   — save a settings patch.
 * POST  — quick safety actions: `halt` / `resume` (kill switch) and
 *         `arm` / `disarm` (master enable).
 */

export function GET() {
  try {
    const settings = getExchangeSettings()
    const realisedPnl24h = realisedPnlSince(Date.now() - DAY_MS)

    return NextResponse.json({
      settings: publicExchangeSettings(settings),
      orders: getRecentTradeOrders(50),
      openPosition: getOpenBuyPosition(config.symbol),
      realisedPnl24h,
      symbol: config.symbol,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read trading state' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const patch = (await request.json()) as Partial<ExchangeSettings>
    saveExchangeSettings(patch)
    return NextResponse.json({ settings: publicExchangeSettings() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save trading settings' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string }

    switch (body.action) {
      case 'halt':
        saveExchangeSettings({ killSwitch: true })
        return NextResponse.json({
          settings: publicExchangeSettings(),
          message: 'Trading halted — kill switch engaged',
        })

      case 'resume':
        saveExchangeSettings({ killSwitch: false })
        return NextResponse.json({ settings: publicExchangeSettings(), message: 'Kill switch released' })

      case 'arm':
        saveExchangeSettings({ enabled: true, killSwitch: false })
        return NextResponse.json({ settings: publicExchangeSettings(), message: 'Automatic trading armed' })

      case 'disarm':
        saveExchangeSettings({ enabled: false })
        return NextResponse.json({ settings: publicExchangeSettings(), message: 'Automatic trading disabled' })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 },
    )
  }
}
