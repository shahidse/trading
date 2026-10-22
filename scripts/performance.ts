import { getTradingExchange, fetchLivePosition } from '@/lib/exchange/client'
import { getCoinTradeStats, getLastSignal } from '@/lib/db/client'
import { getExchangeSettings } from '@/lib/exchange/settings'

const DEFAULT_TOP_SYMBOLS = ['ETH/USDT', 'BTC/USDT', 'SOL/USDT', 'HYPE/USDT', 'BNB/USDT']
const TARGET_SYMBOLS = process.env.SYMBOLS
  ? process.env.SYMBOLS.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  : DEFAULT_TOP_SYMBOLS

async function main() {
  const settings = getExchangeSettings()
  const exchange = await getTradingExchange()

  console.log('='.repeat(90))
  console.log(
    `  TOP 5 COINS PERFORMANCE LEADERBOARD  [${settings.testnet ? 'BINANCE TESTNET' : 'BINANCE LIVE'}]`
  )
  console.log(`  Allocated per coin: $${settings.notionalUsd} USDT  |  Time: ${new Date().toISOString()}`)
  console.log('='.repeat(90))

  const results = []

  for (const symbol of TARGET_SYMBOLS) {
    try {
      const [livePos, stats, lastSig] = await Promise.all([
        fetchLivePosition(exchange, symbol).catch(() => ({
          hasPosition: false,
          baseHeld: 0,
          baseFree: 0,
          baseLocked: 0,
          price: 0,
          notionalUsd: 0,
          hasOpenOrders: false,
          openOrdersCount: 0,
        })),
        Promise.resolve(getCoinTradeStats(symbol)),
        Promise.resolve(getLastSignal(symbol)),
      ])

      results.push({
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
      })
    } catch (err) {
      console.error(`Failed to fetch stats for ${symbol}:`, err)
    }
  }

  // Rank by Realised PnL descending
  results.sort((a, b) => b.realisedPnlUsd - a.realisedPnlUsd)

  console.log(
    'Rank  Coin       Price        Signal    Position Status          Trades  WinRate   Realised PnL'
  )
  console.log('-'.repeat(90))

  results.forEach((r, idx) => {
    const rank = `#${idx + 1}`.padEnd(5)
    const coin = r.symbol.padEnd(10)
    const priceStr = `$${r.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`.padEnd(12)
    const signalStr = r.lastAction.padEnd(9)
    const posDesc = r.hasPosition
      ? `${r.baseHeld.toFixed(4)} (~$${r.notionalUsd.toFixed(1)}) [${r.openOrdersCount} OCO]`
      : 'Flat (Cash)'
    const posStr = posDesc.padEnd(24)
    const tradesStr = `${r.closedTrades}/${r.totalTrades}`.padEnd(7)
    const winRateStr = `${r.winRatePct.toFixed(1)}%`.padEnd(9)
    const pnlSign = r.realisedPnlUsd > 0 ? '+' : ''
    const pnlStr = `${pnlSign}$${r.realisedPnlUsd.toFixed(2)}`

    console.log(
      `${rank} ${coin} ${priceStr} ${signalStr} ${posStr} ${tradesStr} ${winRateStr} ${pnlStr}`
    )
  })

  console.log('='.repeat(90))
  const totalPnl = results.reduce((acc, r) => acc + r.realisedPnlUsd, 0)
  const activePositions = results.filter((r) => r.hasPosition).length
  console.log(
    `Summary: ${activePositions}/${results.length} Coins Holding Position  |  Total Realised PnL: ${
      totalPnl >= 0 ? '+' : ''
    }$${totalPnl.toFixed(2)}`
  )
  console.log(
    `Switch to Live Mainnet anytime by setting BINANCE_TESTNET=false in .env.local`
  )
  console.log('='.repeat(90))
}

main().catch(console.error)
