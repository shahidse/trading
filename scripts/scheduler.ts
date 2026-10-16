import cron from 'node-cron'
import { config } from '@/lib/config'
import { runAnalysis } from '@/lib/pipeline'
import { isEmailConfigured } from '@/lib/notify/resend'

/**
 * Local 15-minute scheduler.
 *
 *   npm run scheduler
 *
 * Runs one pass immediately, then on every 15-minute boundary. Deploying later
 * (Vercel Cron / a worker / Docker) means calling `runAnalysis()` on a schedule.
 */
const SCHEDULE = process.env.CRON_SCHEDULE ?? '*/15 * * * *'

async function tick(): Promise<void> {
  const at = new Date().toISOString()
  try {
    const result = await runAnalysis()
    const s = result.signal
    console.log(
      `[${at}] ${s.plan.action} (${s.direction}) · score ${s.score} · $${s.price.toLocaleString()}` +
        `${result.actionChanged ? ' · ACTION CHANGED' : ''}` +
        `${result.emailSent ? ' · email sent' : ''}`,
    )
  } catch (error) {
    console.error(`[${at}] analysis failed:`, error instanceof Error ? error.message : error)
  }
}

async function main(): Promise<void> {
  console.log(`ETH signal scheduler — ${config.symbol} ${config.timeframe}`)
  console.log(`Schedule: ${SCHEDULE}   Email: ${isEmailConfigured() ? 'configured' : 'not configured'}`)
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
