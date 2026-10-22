import { NextResponse } from 'next/server'
import { getTradingExchange, fetchLivePosition } from '@/lib/exchange/client'
import { getCoinTradeStats, getLastSignal } from '@/lib/db/client'
import { getExchangeSettings } from '@/lib/exchange/settings'

export const dynamic = 'force-dynamic'

const DEFAULT_TOP_SYMBOLS = ['ETH/USDT', 'BTC/USDT', 'SOL/USDT', 'HYPE/USDT', 'BNB/USDT']
const TARGET_SYMBOLS = process.env.SYMBOLS
  ? process.env.SYMBOLS.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  : DEFAULT_TOP_SYMBOLS

export async function GET() {
  try {
    const settings = getExchangeSettings()
    let exchange = null
    try {
      exchange = await getTradingExchange()
    } catch {
      // Exchange not available
    }

    const coins = await Promise.all(
      TARGET_SYMBOLS.map(async (symbol) => {
        let livePos = {
          hasPosition: false,
          baseHeld: 0,
          baseFree: 0,
          baseLocked: 0,
          price: 0,
          notionalUsd: 0,
          hasOpenOrders: false,
          openOrdersCount: 0,
        }

        if (exchange) {
          try {
            livePos = await fetchLivePosition(exchange, symbol)
          } catch {}
        }

        const stats = getCoinTradeStats(symbol)
        const lastSig = getLastSignal(symbol)

        return {
          symbol,
          price: livePos.price,
          hasPosition: livePos.hasPosition,
          baseHeld: livePos.baseHeld,
          notionalUsd: livePos.notionalUsd,
          openOrdersCount: livePos.openOrdersCount,
          totalTrades: stats.totalBuys,
          closedTrades: stats.winningTrades + stats.losingTrades,
          winRatePct: stats.winRatePct,
          realisedPnlUsd: stats.realisedPnlUsd,
          lastAction: lastSig?.plan.action ?? 'STAY_OUT',
          lastScore: lastSig?.score ?? 0,
        }
      })
    )

    // Sort by Realised PnL descending
    coins.sort((a, b) => b.realisedPnlUsd - a.realisedPnlUsd)

    const totalRealisedPnl = coins.reduce((acc, c) => acc + c.realisedPnlUsd, 0)
    const activePositions = coins.filter((c) => c.hasPosition).length

    return NextResponse.json({
      environment: settings.testnet ? 'testnet' : 'live',
      dryRun: settings.dryRun,
      allocatedPerCoinUsd: settings.notionalUsd,
      totalRealisedPnl,
      activePositions,
      totalCoins: coins.length,
      coins,
      timestamp: Date.now(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
