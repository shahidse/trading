import { config } from '@/lib/config'
import type { IndicatorBundle } from '@/lib/indicators'
import type {
  ConfluenceInfo,
  NotifyMode,
  RegimeInfo,
  SignalDirection,
  TradeAction,
  TradeLevels,
  TradePlan,
} from '@/lib/types'
import { round } from '@/lib/utils'

/** Only BUY and SELL require you to do something right now. */
export function isActionable(action: TradeAction): boolean {
  return action === 'BUY' || action === 'SELL'
}

/**
 * Whether a plan transition deserves an alert.
 *
 * With no previous signal only an actionable plan is worth an email, so a fresh
 * STAY_OUT stays quiet. After that, any change of action alerts — the action is
 * already the consolidated "what do I do" verdict, so comparing actions avoids
 * emailing about a direction flip the plan did not act on.
 */
export function shouldAlert(
  previousAction: TradeAction | null,
  nextAction: TradeAction,
): boolean {
  return previousAction === null ? isActionable(nextAction) : previousAction !== nextAction
}

/** Minimal signal state needed to decide whether an alert is due. */
export type NotifyState = { action: TradeAction; direction: SignalDirection }

/**
 * Mode-aware notification decision, applied per channel.
 *
 *  - `action-change`    — a plan transition worth acting on (see `shouldAlert`)
 *  - `direction-change` — LONG/SHORT/NEUTRAL flipped
 *  - `every`            — every run alerts, no dedupe
 *
 * With no previous signal, `direction-change` alerts only on a non-neutral
 * reading and `action-change` only on an actionable plan, so a fresh
 * STAY_OUT/NEUTRAL stays quiet.
 */
export function shouldNotify(
  mode: NotifyMode,
  previous: NotifyState | null,
  next: NotifyState,
): boolean {
  if (mode === 'every') return true

  if (mode === 'direction-change') {
    return previous ? previous.direction !== next.direction : next.direction !== 'NEUTRAL'
  }

  return shouldAlert(previous?.action ?? null, next.action)
}

export type TrendRead = {
  verdict: 'up' | 'down' | 'neutral'
  /** Human-readable reasons behind the verdict. */
  evidence: string[]
}

/**
 * Direction of the **trend group only** (EMA stack, Ichimoku cloud, MACD zero
 * line) — deliberately ignoring the mean-reversion indicators.
 *
 * This is the gate that fixes the core flaw in the weighted sum: in a downtrend
 * Bollinger/RSI/VWAP/StochRSI all scream "oversold, buy", which is exactly how a
 * long-only spot strategy walks into every falling knife. A majority of the
 * trend group decides whether buying is even allowed.
 */
export function trendRead(bundle: IndicatorBundle): TrendRead {
  const evidence: string[] = []
  let up = 0
  let down = 0

  if (bundle.emaTrend) {
    if (bundle.emaTrend.alignment === 'bullish') {
      up++
      evidence.push('EMAs stacked bullish')
    } else if (bundle.emaTrend.alignment === 'bearish') {
      down++
      evidence.push('EMAs stacked bearish')
    }
  }

  if (bundle.ichimoku) {
    if (bundle.ichimoku.priceVsCloud === 'above') {
      up++
      evidence.push('price above the Ichimoku cloud')
    } else if (bundle.ichimoku.priceVsCloud === 'below') {
      down++
      evidence.push('price below the Ichimoku cloud')
    }
  }

  if (bundle.macd) {
    if (bundle.macd.zeroLine === 'above') {
      up++
      evidence.push('MACD above zero')
    } else {
      down++
      evidence.push('MACD below zero')
    }
  }

  if (bundle.supertrend) {
    if (bundle.supertrend.direction === 'bullish') {
      up++
      evidence.push('SuperTrend bullish')
    } else if (bundle.supertrend.direction === 'bearish') {
      down++
      evidence.push('SuperTrend bearish')
    }
  }

  if (down >= 2 && down > up) return { verdict: 'down', evidence }
  if (up >= 2 && up > down) return { verdict: 'up', evidence }
  return { verdict: 'neutral', evidence }
}

/** ATR-based entry / stop / target. */
function buildLevels(price: number, atrValue: number | null): TradeLevels | null {
  if (!atrValue || atrValue <= 0 || price <= 0) return null

  const stopDistance = atrValue * config.trade.stopAtrMultiple
  const stopLoss = price - stopDistance
  if (stopLoss <= 0) return null

  const rewardDistance = stopDistance * config.trade.rewardMultiple
  const takeProfit = price + rewardDistance

  return {
    entry: round(price, 2),
    stopLoss: round(stopLoss, 2),
    takeProfit: round(takeProfit, 2),
    riskReward: round(config.trade.rewardMultiple, 2),
    stopDistancePct: round((stopDistance / price) * 100, 2),
    targetDistancePct: round((rewardDistance / price) * 100, 2),
  }
}

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export type TradePlanInput = {
  direction: SignalDirection
  price: number
  score: number
  regime: RegimeInfo
  confluence: ConfluenceInfo
  trend: TrendRead
  patternScore?: number
  patternNames?: string[]
  rsiValue?: number | null
  supertrend?: IndicatorBundle['supertrend']
  reversalScalpMode?: boolean
}

/** Tight scalp levels (~0.8% stop, ~1.2% profit target for quick intraday gains). */
function buildScalpLevels(price: number): TradeLevels | null {
  if (price <= 0) return null
  const stopDistancePct = config.scalp.stopDistancePct
  const targetDistancePct = config.scalp.targetDistancePct
  const stopLoss = round(price * (1 - stopDistancePct / 100), 2)
  const takeProfit = round(price * (1 + targetDistancePct / 100), 2)
  const riskReward = round(targetDistancePct / stopDistancePct, 2)

  return {
    entry: round(price, 2),
    stopLoss,
    takeProfit,
    riskReward,
    stopDistancePct,
    targetDistancePct,
  }
}

/**
 * Turn a directional signal into something you can actually act on:
 * enter / hold / sell, plus the price levels that define the risk.
 */
export function buildTradePlan(input: TradePlanInput): TradePlan {
  const {
    direction,
    price,
    score,
    regime,
    confluence,
    trend,
    patternScore = 0,
    patternNames = [],
    rsiValue = null,
    supertrend = null,
    reversalScalpMode = false,
  } = input
  const atrValue = regime.atrValue

  const baseProtectiveStop =
    atrValue && atrValue > 0 && price > 0
      ? round(price - atrValue * config.trade.stopAtrMultiple, 2)
      : null

  // If SuperTrend is bullish and sits beneath the current price, use it as dynamic trailing stop
  const supertrendStop =
    supertrend && supertrend.direction === 'bullish' && supertrend.value < price
      ? round(supertrend.value, 2)
      : null

  const protectiveStop =
    supertrendStop != null && baseProtectiveStop != null
      ? Math.max(baseProtectiveStop, supertrendStop)
      : (supertrendStop ?? baseProtectiveStop)

  const context: string[] = [regime.detail, confluence.detail]

  // Check if there is an active bullish candle pattern, SuperTrend flip, or oversold bounce setup
  const supertrendFlip =
    supertrend && (supertrend.flipped || supertrend.barsSinceFlip <= 1) && supertrend.direction === 'bullish'
  const supertrendSupport =
    supertrend && supertrend.direction === 'bullish' && supertrend.distancePct <= 1.5 && supertrend.distancePct >= 0

  const hasBullishPattern =
    patternScore >= config.scalp.minBullishPatternStrength ||
    patternNames.some(
      (p) =>
        p.toLowerCase().includes('bullish') ||
        p.toLowerCase().includes('hammer') ||
        p.toLowerCase().includes('morning') ||
        p.toLowerCase().includes('piercing') ||
        p.toLowerCase().includes('soldiers'),
    )
  const isOversold = rsiValue !== null && rsiValue <= config.scalp.oversoldRsiThreshold
  const scalpTriggered =
    reversalScalpMode &&
    (hasBullishPattern || supertrendFlip || supertrendSupport || (isOversold && score > -15))

  const scalpTriggerReason = supertrendFlip
    ? 'SuperTrend bullish flip (fresh momentum)'
    : supertrendSupport
      ? `SuperTrend support bounce ($${supertrend?.value})`
      : hasBullishPattern
        ? `Bullish pattern (${patternNames.join(', ') || 'reversal candle'})`
        : (isOversold ? `RSI oversold bounce (${rsiValue})` : 'Bullish candle momentum')

  // ---------- LONG ----------
  if (direction === 'LONG') {
    const counterTrend =
      config.trade.blockCounterTrend &&
      regime.regime !== 'ranging' &&
      (trend.verdict === 'down' ||
        (regime.regime === 'trending' && regime.direction === 'bearish'))

    if (counterTrend) {
      // If Reversal Scalping Mode is active and bullish setup confirms, execute scalp BUY
      if (reversalScalpMode && (hasBullishPattern || supertrendFlip || score >= 20)) {
        const scalpLevels = buildScalpLevels(price)
        return {
          action: 'BUY',
          gate: 'scalp-open',
          headline: scalpLevels
            ? `Reversal Scalp Long ~${money(scalpLevels.entry)} · tight stop ${money(
                scalpLevels.stopLoss,
              )} · target ${money(scalpLevels.takeProfit)} (+${scalpLevels.targetDistancePct}%)`
            : 'Reversal Scalp Long at market',
          forFlat: scalpLevels
            ? `Scalp bullish bounce. Buy near ${money(scalpLevels.entry)} with tight stop ${money(
                scalpLevels.stopLoss,
              )} (−${scalpLevels.stopDistancePct}%) and target ${money(scalpLevels.takeProfit)} (+${
                scalpLevels.targetDistancePct
              }%).`
            : 'Scalp bullish candle at market.',
          forHolder: 'Take quick profit at target — counter-trend scalp.',
          levels: scalpLevels,
          protectiveStop,
          rationale: [
            ...context,
            `Reversal Scalping Mode active: ${scalpTriggerReason} during downtrend.`,
            'Executing quick-profit scalp order with tight risk controls.',
          ],
        }
      }

      return {
        action: 'STAY_OUT',
        gate: 'blocked-by-trend',
        headline: 'Do not buy — bullish score blocked by a bearish trend',
        forFlat:
          'Stay out. Wait for the trend group (EMA stack / cloud / MACD) to stop pointing down, or enable Reversal Scalp Mode.',
        forHolder: 'Consider trimming. Do not add to this position.',
        levels: null,
        protectiveStop,
        rationale: [
          ...context,
          `Composite is bullish (${score}) but the trend gate is closed: ${trend.evidence.join(', ')}.`,
          'Trend filter active — to trade intraday bounces, enable Reversal Scalping Mode in Settings.',
        ],
      }
    }

    const levels = buildLevels(price, atrValue)

    return {
      action: 'BUY',
      gate: 'open',
      headline: levels
        ? `Enter long ~${money(levels.entry)} · stop ${money(levels.stopLoss)} · target ${money(
            levels.takeProfit,
          )} · R:R ${levels.riskReward}`
        : 'Enter long at market (ATR unavailable — no stop/target derived)',
      forFlat: levels
        ? `Buy ETH spot near ${money(levels.entry)}. Stop ${money(levels.stopLoss)} (−${
            levels.stopDistancePct
          }%), take profit ${money(levels.takeProfit)} (+${levels.targetDistancePct}%).`
        : 'Buy ETH spot at market. Set a stop manually — ATR was unavailable.',
      forHolder:
        'Hold. Trail your stop upward as price advances, and take profit at the target.',
      levels,
      protectiveStop,
      rationale: [
        ...context,
        `Composite ${score} clears the LONG threshold; trend group agrees (${trend.evidence.join(', ') || 'neutral'}).`,
        levels
          ? `Risk is defined by the stop ${levels.stopDistancePct}% away, targeting ${levels.targetDistancePct}% (${levels.riskReward}R).`
          : 'Levels could not be derived because ATR was unavailable.',
      ],
    }
  }

  // ---------- SHORT ----------
  if (direction === 'SHORT') {
    // Even during SHORT reading, if user enabled Reversal Scalp Mode and strong bullish reversal triggers
    if (scalpTriggered && (hasBullishPattern || supertrendFlip)) {
      const scalpLevels = buildScalpLevels(price)
      return {
        action: 'BUY',
        gate: 'scalp-open',
        headline: scalpLevels
          ? `Intraday Scalp Bounce ~${money(scalpLevels.entry)} · tight stop ${money(
              scalpLevels.stopLoss,
            )} · target ${money(scalpLevels.takeProfit)} (+${scalpLevels.targetDistancePct}%)`
          : 'Intraday Scalp Long at market',
        forFlat: scalpLevels
          ? `Quick scalp: ${scalpTriggerReason} detected. Buy near ${money(scalpLevels.entry)}, target ${money(
              scalpLevels.takeProfit,
            )} (+${scalpLevels.targetDistancePct}%).`
          : 'Quick scalp on bullish reversal pattern.',
        forHolder: 'Take fast profit at target; overall macro trend is still downward.',
        levels: scalpLevels,
        protectiveStop,
        rationale: [
          ...context,
          `Reversal Scalping Mode: ${scalpTriggerReason} detected despite negative composite ${score}.`,
          `Targeting quick +${config.scalp.targetDistancePct}% profit with tight stop −${config.scalp.stopDistancePct}%.`,
        ],
      }
    }

    return {
      action: 'SELL',
      gate: 'open',
      headline: 'Sell / exit long — bearish signal',
      forFlat: 'Stay out. Spot cannot short — wait for a fresh bullish setup.',
      forHolder: `Exit the position now. ${
        protectiveStop != null ? `If you are not exiting, a stop near ${money(protectiveStop)} limits damage.` : ''
      }`.trim(),
      levels: null,
      protectiveStop,
      rationale: [
        ...context,
        `Composite ${score} is below the SHORT threshold.`,
        trend.verdict === 'down'
          ? `Trend group confirms the downside: ${trend.evidence.join(', ')}.`
          : 'Trend group is not confirming, so treat this as a defensive exit rather than a short entry.',
      ],
    }
  }

  // ---------- NEUTRAL ----------
  if (scalpTriggered) {
    const scalpLevels = buildScalpLevels(price)
    return {
      action: 'BUY',
      gate: 'scalp-open',
      headline: scalpLevels
        ? `Intraday Scalp Long ~${money(scalpLevels.entry)} · stop ${money(
            scalpLevels.stopLoss,
          )} · target ${money(scalpLevels.takeProfit)} (+${scalpLevels.targetDistancePct}%)`
        : 'Intraday Scalp Long at market',
      forFlat: scalpLevels
        ? `Scalp bounce: ${scalpTriggerReason} in neutral range. Enter near ${money(scalpLevels.entry)}, stop ${money(
            scalpLevels.stopLoss,
          )}, target ${money(scalpLevels.takeProfit)} (+${scalpLevels.targetDistancePct}%).`
        : 'Enter scalp long on bullish candle bounce.',
      forHolder: 'Hold and take profit at scalp target.',
      levels: scalpLevels,
      protectiveStop,
      rationale: [
        ...context,
        `Reversal Scalp triggered in neutral market: ${scalpTriggerReason}.`,
        `Aiming for intraday gain of +${config.scalp.targetDistancePct}%.`,
      ],
    }
  }

  const waiting = trend.verdict === 'up' ? 'Trend is still constructive' : 'No directional edge'

  return {
    action: 'STAY_OUT',
    gate: 'no-edge',
    headline: 'No trade — wait for a clear signal',
    forFlat: 'Stay flat and wait. Do not open a position in the neutral band.',
    forHolder:
      protectiveStop != null
        ? `Hold, but keep a stop near ${money(protectiveStop)}. Do not add.`
        : 'Hold, but do not add. No clear edge either way.',
    levels: null,
    protectiveStop,
    rationale: [
      ...context,
      `${waiting} — composite ${score} is inside the neutral band.`,
    ],
  }
}
