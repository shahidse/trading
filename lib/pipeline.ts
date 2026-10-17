import { getMarketSnapshot, type SnapshotOptions } from '@/lib/data/aggregate'
import { getLastSignal, markEmailed, saveSignal } from '@/lib/db/client'
import { runAutoTrade, type TradeOutcome } from '@/lib/exchange/trader'
import { getNotifySettings } from '@/lib/notify/settings'
import { isEmailConfigured, sendSignalEmail } from '@/lib/notify/resend'
import { isTelegramConfigured, sendSignalTelegram } from '@/lib/notify/telegram'
import { generateSignal } from '@/lib/signal/engine'
import { shouldAlert, shouldNotify, type NotifyState } from '@/lib/signal/plan'
import type { NotifyMode, Signal, SignalDirection, TradeAction } from '@/lib/types'

export type AnalysisResult = {
  signal: Signal
  id: number
  /** Plan action of the previously stored signal, if there was one. */
  previousAction: TradeAction | null
  /** True when the plan action differs from the last stored signal. */
  actionChanged: boolean
  previousDirection: SignalDirection | null
  directionChanged: boolean
  /** Effective trigger mode per channel. */
  emailMode: NotifyMode
  telegramMode: NotifyMode
  emailSent: boolean
  telegramSent: boolean
  /** Automatic order placement result, or null when trading is not armed. */
  trade: TradeOutcome | null
}

/**
 * The full analysis run:
 *
 *   fetch market data → score indicators → persist → alert on the configured trigger
 *
 * Shared by the CLI one-shot script, the scheduler, and the API route.
 *
 * Each channel has its own trigger mode (`action-change`, `direction-change`,
 * `every` — configured on the /settings page), so email and Telegram can be
 * tuned independently. With `action-change`, an alert mirrors what the plan
 * tells you to do: a LONG direction that the trend gate blocks stays STAY_OUT,
 * so it never produces a misleading alert.
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
  const settings = getNotifySettings()

  const previousAction = previous?.plan.action ?? null
  const actionChanged = shouldAlert(previousAction, signal.plan.action)

  const directionChanged = previous
    ? previous.direction !== signal.direction
    : signal.direction !== 'NEUTRAL'

  const previousState: NotifyState | null = previous
    ? { action: previous.plan.action, direction: previous.direction }
    : null
  const nextState: NotifyState = { action: signal.plan.action, direction: signal.direction }

  const id = saveSignal(signal)

  // Automatic order placement. A no-op unless trading is armed in /settings,
  // and every guard runs inside `runAutoTrade` before any signed request.
  const trade = await runAutoTrade(previousAction, signal.plan.action, id, signal.plan.levels)

  let emailSent = false
  if (shouldNotify(settings.email.mode, previousState, nextState) && isEmailConfigured()) {
    try {
      emailSent = await sendSignalEmail(signal)
      if (emailSent) markEmailed(id)
    } catch (error) {
      console.error('[notify] failed to send email:', error)
    }
  }

  let telegramSent = false
  if (shouldNotify(settings.telegram.mode, previousState, nextState) && isTelegramConfigured()) {
    try {
      telegramSent = await sendSignalTelegram(signal)
    } catch (error) {
      console.error('[notify] failed to send Telegram message:', error)
    }
  }

  return {
    signal,
    id,
    previousAction,
    actionChanged,
    previousDirection: previous?.direction ?? null,
    directionChanged,
    emailMode: settings.email.mode,
    telegramMode: settings.telegram.mode,
    emailSent,
    telegramSent,
    trade,
  }
}
