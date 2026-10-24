import { NextResponse } from 'next/server'
import {
  getHotCoinSettings,
  publicHotCoinSettings,
  saveHotCoinSettings,
  type HotCoinTradingSettings,
} from '@/lib/exchange/hot-coins-settings'
import {
  evaluateHotCoinCandidates,
  executeHotCoinBuys,
  executeSingleHotCoinBuy,
  getActiveHotCoinPositions,
  hasActivePositionForCoin,
  getLastBuyTimestampForCoin,
} from '@/lib/exchange/hot-coins-trader'
import { scanHotCoins } from '@/lib/data/scanner'
import { getRecentTradeOrders } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = getHotCoinSettings()
    const scannerResult = await scanHotCoins().catch(() => null)

    const pool = scannerResult ? (scannerResult.hotCoins.length > 0 ? scannerResult.hotCoins : scannerResult.allCoins) : []
    const isDryRun = settings.dryRun

    const evaluation = evaluateHotCoinCandidates(
      pool,
      settings,
      (sym) => hasActivePositionForCoin(sym, isDryRun),
      (sym) => getLastBuyTimestampForCoin(sym),
    )

    const openPositions = getActiveHotCoinPositions(isDryRun)
    const recentOrders = getRecentTradeOrders(25)

    return NextResponse.json({
      settings: publicHotCoinSettings(settings),
      evaluation,
      openPositions,
      recentOrders,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch hot coin trading state' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const patch = (await request.json()) as Partial<HotCoinTradingSettings>
    const updated = saveHotCoinSettings(patch)
    return NextResponse.json({
      settings: publicHotCoinSettings(updated),
      message: 'Hot coin trading settings saved successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update hot coin trading settings' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: 'execute_top' | 'buy_single' | 'enable' | 'disable'
      topCount?: number
      symbol?: string
      notionalUsd?: number
      force?: boolean
    }

    if (body.action === 'enable') {
      const updated = saveHotCoinSettings({ enabled: true })
      return NextResponse.json({
        settings: publicHotCoinSettings(updated),
        message: 'Hot coin automated buying enabled',
      })
    }

    if (body.action === 'disable') {
      const updated = saveHotCoinSettings({ enabled: false })
      return NextResponse.json({
        settings: publicHotCoinSettings(updated),
        message: 'Hot coin automated buying disabled',
      })
    }

    if (body.action === 'buy_single') {
      if (!body.symbol) {
        return NextResponse.json({ error: 'Symbol is required for single buy' }, { status: 400 })
      }
      const res = await executeSingleHotCoinBuy(body.symbol, body.notionalUsd)
      return NextResponse.json(res)
    }

    if (body.action === 'execute_top') {
      const report = await executeHotCoinBuys({
        force: body.force ?? true,
        topCount: body.topCount,
      })
      return NextResponse.json(report)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 },
    )
  }
}
