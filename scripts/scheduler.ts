import cron from 'node-cron'
import { config } from '@/lib/config'
import { runAnalysis } from '@/lib/pipeline'
import { isEmailConfigured } from '@/lib/notify/resend'
import { normalizeSymbol } from '@/lib/constants/coins'
import { isTelegramConfigured } from '@/lib/notify/telegram'

/**
 * Local 15-minute scheduler.
 *
 *   npm run scheduler
 *
 * Runs one pass immediately, then on every 15-minute boundary. Deploying later
 * (Vercel Cron / a worker / Docker) means calling `runAnalysis()` on a schedule.
 */
const SCHEDULE = process.env.CRON_SCHEDULE ?? '*/15 * * * *'
const TARGET_SYMBOLS = process.env.SYMBOLS
  ? process.env.SYMBOLS.split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .map((s) => (s.includes('/') ? s : `${s}/USDT`))
      .map((s) => normalizeSymbol(s))
  : [config.symbol]

async function tick(): Promise<void> {
  const at = new Date().toISOString()
  for (const sym of TARGET_SYMBOLS) {
    try {
      const result = await runAnalysis({ symbol: sym })
      const s = result.signal
      console.log(
        `[${at}] [${sym}] ${s.plan.action} (${s.direction}) · score ${s.score} · $${s.price.toLocaleString()}` +
          `${result.actionChanged ? ' · ACTION CHANGED' : ''}` +
          `${result.emailSent ? ' · email sent' : ''}` +
          `${result.telegramSent ? ' · telegram sent' : ''}` +
          `${result.trade ? ` · trade ${result.trade.status}` : ''}`,
      )
    } catch (error) {
      console.error(`[${at}] [${sym}] analysis failed:`, error instanceof Error ? error.message : error)
    }
  }

  // Periodic Hot Coins automated breakout entries (if enabled in settings)
  try {
    const { getHotCoinSettings } = await import('@/lib/exchange/hot-coins-settings')
    const { executeHotCoinBuys } = await import('@/lib/exchange/hot-coins-trader')
    const hotSettings = getHotCoinSettings()
    if (hotSettings.enabled) {
      const hotReport = await executeHotCoinBuys()
      if (hotReport.executedCount > 0) {
        console.log(`[${at}] [HOT-COINS] ${hotReport.message}`)
      }
    }
  } catch (err) {
    console.warn(`[${at}] [HOT-COINS] Auto-buy check failed:`, err)
  }

  // Periodic Binance Square prediction milestone tracking (Target Met / Reached)
  try {
    const { checkAndPublishMetSquarePredictions } = await import('@/lib/notify/binance-square')
    const squareReport = await checkAndPublishMetSquarePredictions()
    if (squareReport.metCount > 0) {
      console.log(`[${at}] [SQUARE-PREDICTIONS] Published ${squareReport.metCount} target milestone post(s) to Binance Square!`)
    }
  } catch (err) {
    console.warn(`[${at}] [SQUARE-PREDICTIONS] Milestone check failed:`, err)
  }
}

async function main(): Promise<void> {
  console.log(`Crypto signal scheduler — ${TARGET_SYMBOLS.join(', ')} (default: ${config.symbol}) ${config.timeframe}`)
  console.log(
    `Schedule: ${SCHEDULE}   Email: ${isEmailConfigured() ? 'configured' : 'not configured'}` +
      `   Telegram: ${isTelegramConfigured() ? 'configured' : 'not configured'}`,
  )
  console.log('Running an initial pass…')

  await tick()

  cron.schedule(SCHEDULE, () => {
    void tick()
  })

  console.log(`Scheduler running. Next passes fire on the 15-minute boundary.`)
}

main().catch((error) => {
  console.error('Scheduler failed to start:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
