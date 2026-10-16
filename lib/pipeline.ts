import { getMarketSnapshot, type SnapshotOptions } from '@/lib/data/aggregate'
import { getLastSignal, markEmailed, saveSignal } from '@/lib/db/client'
import { isEmailConfigured, sendSignalEmail } from '@/lib/notify/resend'
import { generateSignal } from '@/lib/signal/engine'
import { shouldAlert } from '@/lib/signal/plan'
import type { Signal, SignalDirection, TradeAction } from '@/lib/types'

export type AnalysisResult = {
  signal: Signal
  id: number
  /** Plan action of the previously stored signal, if there was one. */
  previousAction: TradeAction | null
  /** True when the plan action differs from the last stored signal. */
  actionChanged: boolean
  previousDirection: SignalDirection | null
  directionChanged: boolean
  emailSent: boolean
}

/**
 * The full analysis run:
 *
 *   fetch market data → score indicators → persist → email on plan-action change
 *
 * Shared by the CLI one-shot script, the scheduler, and the API route.
 *
 * The alert trigger is the **plan action**, not the raw direction: an email
 * should mirror what the plan tells you to do. A LONG direction that the trend
 * gate blocks stays STAY_OUT, so it no longer produces a misleading alert.
 * Deduplicated against the previously stored signal.
 */
export async function runAnalysis(options: SnapshotOptions = {}): Promise<AnalysisResult> {
  const snapshot = await getMarketSnapshot(options)

  const signal = generateSignal(snapshot.candles, {
    symbol: snapshot.symbol,
    timeframe: snapshot.timeframe,
    price: snapshot.price,
    chainlinkPrice: snapshot.chainlink?.price ?? null,
    divergencePct: snapshot.divergencePct,
    timestamp: Date.now(),
  })

  const previous = getLastSignal()

  const previousAction = previous?.plan.action ?? null
  const actionChanged = shouldAlert(previousAction, signal.plan.action)

  const directionChanged = previous
    ? previous.direction !== signal.direction
    : signal.direction !== 'NEUTRAL'

  const id = saveSignal(signal)

  let emailSent = false
  if (actionChanged && isEmailConfigured()) {
    try {
      emailSent = await sendSignalEmail(signal)
      if (emailSent) markEmailed(id)
    } catch (error) {
      console.error('[notify] failed to send email:', error)
    }
  }

  return {
    signal,
    id,
    previousAction,
    actionChanged,
    previousDirection: previous?.direction ?? null,
    directionChanged,
    emailSent,
  }
}
