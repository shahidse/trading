import cron from 'node-cron'
import { config } from '@/lib/config'
import { runAnalysis } from '@/lib/pipeline'
import { isEmailConfigured } from '@/lib/notify/resend'
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
  ? process.env.SYMBOLS.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
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
