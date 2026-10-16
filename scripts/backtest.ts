import { runBacktest } from '@/lib/backtest/replay'
import { config } from '@/lib/config'
import { fetchCandles } from '@/lib/data/binance'

/**
 * Backtest the strategy over historical candles.
 *
 *   npm run backtest                    # 1000 candles, trade plan on
 *   npm run backtest -- 3000            # custom candle count
 *   npm run backtest -- 3000 --no-plan  # raw signal baseline (no gate, no stops)
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const useTradePlan = !args.includes('--no-plan')
  const limit = Number(args.find((arg) => /^\d+$/.test(arg)) ?? 1000)

  console.log(`Fetching ${limit} × ${config.timeframe} candles for ${config.symbol}…`)

  const candles = await fetchCandles(config.symbol, config.timeframe, limit)
  const result = runBacktest(candles, { useTradePlan })

  const from = new Date(candles[0].time).toISOString().slice(0, 16).replace('T', ' ')
  const to = new Date(candles[candles.length - 1].time).toISOString().slice(0, 16).replace('T', ' ')

  console.log('')
  console.log('─'.repeat(60))
  console.log(`Backtest  ${result.symbol} ${result.timeframe}   ${from} → ${to} (UTC)`)
  console.log('─'.repeat(60))
  console.log(`Candles          : ${result.candles} (warm-up ${result.warmupBars})`)
  console.log(
    `Mode             : ${
      useTradePlan ? 'TRADE PLAN (trend gate + ATR stops/targets)' : 'RAW SIGNAL (no gate, no stops)'
    }`,
  )
  console.log(`Signals          : LONG ${result.signalCounts.LONG} · SHORT ${result.signalCounts.SHORT} · NEUTRAL ${result.signalCounts.NEUTRAL}`)
  console.log(`Trades           : ${result.trades.length}`)
  console.log(
    `Exits            : stop ${result.exits.stop} · target ${result.exits.target} · ` +
      `signal ${result.exits.signal} · still open ${result.exits['end-of-data']}`,
  )
  console.log(`Blocked by gate  : ${result.blockedEntries} bullish entries refused`)
  console.log(`Risk model       : stop ${result.stopAtrMultiple}× ATR · target ${result.rewardMultiple}R`)
  console.log(`Exposure         : ${result.exposurePct}%`)
  console.log('')
  console.log(`Total return     : ${result.totalReturnPct}%`)
  console.log(`Buy & hold       : ${result.buyHoldReturnPct}%`)
  console.log(`Win rate         : ${result.winRate}%`)
  console.log(`Avg win / loss   : ${result.avgWinPct}% / -${result.avgLossPct}%`)
  console.log(`Profit factor    : ${result.profitFactor}`)
  console.log(`Max drawdown     : ${result.maxDrawdownPct}%`)
  console.log('')
}

main().catch((error) => {
  console.error('Backtest failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
