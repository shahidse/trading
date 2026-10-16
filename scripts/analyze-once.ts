import { config } from '@/lib/config'
import { runAnalysis } from '@/lib/pipeline'

/**
 * Run a single analysis pass — useful for manual checks and cron debugging.
 *
 *   npm run analyze
 */
async function main(): Promise<void> {
  const started = Date.now()
  const result = await runAnalysis()
  const s = result.signal

  const arrow = s.direction === 'LONG' ? '▲' : s.direction === 'SHORT' ? '▼' : '■'

  console.log('─'.repeat(64))
  console.log(`${arrow}  ${s.direction}  ·  ${s.symbol} ${s.timeframe}`)
  console.log('─'.repeat(64))
  console.log(`Score       : ${s.score > 0 ? '+' : ''}${s.score}  (confidence ${s.confidence})`)
  console.log(`Price       : $${s.price.toLocaleString()}`)
  console.log(
    `Chainlink   : ${s.chainlinkPrice != null ? `$${s.chainlinkPrice.toLocaleString()}` : 'n/a'}` +
      `   divergence: ${s.divergencePct != null ? `${s.divergencePct}%` : 'n/a'}`,
  )
  console.log('')
  console.log(`Regime      : ${s.regime.detail}`)
  console.log(`Confluence  : ${s.confluence.detail}`)
  console.log(`Thresholds  : ${s.thresholdsUsed.long} / ${s.thresholdsUsed.short}`)
  console.log('')
  console.log(`PLAN        : ${s.plan.action} — ${s.plan.headline}`)
  if (s.plan.levels) {
    console.log(
      `  entry ${s.plan.levels.entry}  ·  stop ${s.plan.levels.stopLoss}  ·  ` +
        `target ${s.plan.levels.takeProfit}  ·  R:R ${s.plan.levels.riskReward}`,
    )
  } else if (s.plan.protectiveStop != null) {
    console.log(`  protective stop ${s.plan.protectiveStop} (if already holding)`)
  }
  console.log(`  gate      : ${s.plan.gate}`)
  console.log(`  if flat   : ${s.plan.forFlat}`)
  console.log(`  if holding: ${s.plan.forHolder}`)
  console.log('')
  for (const indicator of s.indicators) {
    const sign = indicator.contribution > 0 ? '+' : ''
    console.log(
      `  ${indicator.label.padEnd(22)} [${indicator.group.padEnd(14)}]` +
        ` raw ${String(indicator.raw).padStart(6)}  w ${String(
          Math.round(indicator.weight * 100),
        ).padStart(3)}%  contrib ${sign}${indicator.contribution}`,
    )
    console.log(`    ${indicator.detail}`)
  }
  console.log('')
  console.log(
    `Previous    : action ${result.previousAction ?? 'none'} → ${s.plan.action}` +
      `  ·  changed: ${result.actionChanged}`,
  )
  console.log(
    `              direction ${result.previousDirection ?? 'none'} → ${s.direction}` +
      `  ·  changed: ${result.directionChanged}`,
  )
  console.log(
    `Email       : ${result.emailSent ? 'sent' : 'not sent'}  (mode: ${result.emailMode})`,
  )
  console.log(
    `Telegram    : ${result.telegramSent ? 'sent' : 'not sent'}  (mode: ${result.telegramMode})`,
  )
  console.log(
    `Trade       : ${
      result.trade
        ? `${result.trade.status} — ${result.trade.reason}`
        : 'not armed (see /settings)'
    }`,
  )
  console.log(`Stored id   : ${result.id}`)
  console.log(`Elapsed     : ${Date.now() - started} ms`)
}

main().catch((error) => {
  console.error('Analysis failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
