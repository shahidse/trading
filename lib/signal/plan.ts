import { config } from '@/lib/config'
import type { IndicatorBundle } from '@/lib/indicators'
import type {
  ConfluenceInfo,
  MacroTrendInfo,
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

/** ATR-based entry / stop / target with staged multi-tier take-profits. */
function buildLevels(price: number, atrValue: number | null): TradeLevels | null {
  if (!atrValue || atrValue <= 0 || price <= 0) return null

  const stopDistance = atrValue * config.trade.stopAtrMultiple
  const stopLoss = price - stopDistance
  if (stopLoss <= 0) return null

  const rewardDistance = stopDistance * config.trade.rewardMultiple
  const takeProfit = price + rewardDistance

  // Multi-tier staged targets:
  // Tier 1: 50% scale-out at 1.5R stop distance -> triggers Breakeven Stop
  const tp1Distance = stopDistance * 1.5
  const tp1Price = round(price + tp1Distance, 2)
  // Tier 2: 30% scale-out at 2.6R stop distance -> trails with SuperTrend
  const tp2Distance = stopDistance * 2.6
  const tp2Price = round(price + tp2Distance, 2)
  // Tier 3: 20% trailing runner at 3.5R stop distance
  const runnerDistance = stopDistance * 3.5
  const runnerPrice = round(price + runnerDistance, 2)

  const stagedTargets = [
    {
      tier: 1,
      price: tp1Price,
      distancePct: round((tp1Distance / price) * 100, 2),
      sizePct: 50,
      riskReward: 1.5,
      action: 'breakeven-stop' as const,
    },
    {
      tier: 2,
      price: tp2Price,
      distancePct: round((tp2Distance / price) * 100, 2),
      sizePct: 30,
      riskReward: 2.6,
      action: 'trail-stop' as const,
    },
    {
      tier: 3,
      price: runnerPrice,
      distancePct: round((runnerDistance / price) * 100, 2),
      sizePct: 20,
      riskReward: 3.5,
      action: 'close-runner' as const,
    },
  ]

  return {
    entry: round(price, 2),
    stopLoss: round(stopLoss, 2),
    takeProfit: round(takeProfit, 2),
    riskReward: round(config.trade.rewardMultiple, 2),
    stopDistancePct: round((stopDistance / price) * 100, 2),
    targetDistancePct: round((rewardDistance / price) * 100, 2),
    stagedTargets,
    breakevenPrice: tp1Price,
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
  macroTrend?: MacroTrendInfo
  reversalScalpMode?: boolean
}

/** Tight scalp levels with dynamic target based on 1h macro trend alignment (~0.8% stop, ~1.0-1.4% target). */
function buildScalpLevels(price: number, macroVerdict: 'bullish' | 'bearish' | 'neutral' = 'neutral'): TradeLevels | null {
  if (price <= 0) return null
  const stopDistancePct = config.scalp.stopDistancePct
  // 1h Macro Trend alignment tuning:
  // - Bullish macro: allow 1.4% target expansion with macro tailwind
  // - Bearish macro: take quick 1.0% profit before macro pressure resumes
  // - Neutral: standard 1.2% target
  const targetDistancePct =
    macroVerdict === 'bullish'
      ? Math.max(config.scalp.targetDistancePct, 1.4)
      : macroVerdict === 'bearish'
      ? Math.min(config.scalp.targetDistancePct, 1.0)
      : config.scalp.targetDistancePct

  const stopLoss = round(price * (1 - stopDistancePct / 100), 2)
  const takeProfit = round(price * (1 + targetDistancePct / 100), 2)
  const riskReward = round(targetDistancePct / stopDistancePct, 2)

  // Staged Scalp targets:
  // Tier 1: 70% at 75% of target -> ratchet to breakeven
  // Tier 2: 30% runner at 100% of target
  const tp1Price = round(price * (1 + (targetDistancePct * 0.75) / 100), 2)
  const stagedTargets = [
    {
      tier: 1,
      price: tp1Price,
      distancePct: round(targetDistancePct * 0.75, 2),
      sizePct: 70,
      riskReward: round((targetDistancePct * 0.75) / stopDistancePct, 2),
      action: 'breakeven-stop' as const,
    },
    {
      tier: 2,
      price: takeProfit,
      distancePct: targetDistancePct,
      sizePct: 30,
      riskReward,
      action: 'trail-stop' as const,
    },
  ]

  return {
    entry: round(price, 2),
    stopLoss,
    takeProfit,
    riskReward,
    stopDistancePct,
    targetDistancePct,
    stagedTargets,
    breakevenPrice: tp1Price,
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
    macroTrend,
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

  const macroVerdict = macroTrend?.verdict ?? 'neutral'
  const context: string[] = [
    regime.detail,
    confluence.detail,
    ...(macroTrend ? [`Macro (1h): ${macroTrend.detail} (${macroTrend.verdict})`] : []),
  ]

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
        const scalpLevels = buildScalpLevels(price, macroVerdict)
        const macroTag =
          macroVerdict === 'bullish'
            ? ' (1h Macro Aligned)'
            : macroVerdict === 'bearish'
            ? ' (Counter-Macro)'
            : ''
        return {
          action: 'BUY',
          gate: 'scalp-open',
          headline: scalpLevels
            ? `Reversal Scalp Long${macroTag} ~${money(scalpLevels.entry)} · tight stop ${money(
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
          forHolder:
            macroVerdict === 'bullish'
              ? 'Macro trend is bullish — trail stop and target full expansion.'
              : 'Take quick profit at target — counter-trend scalp.',
          levels: scalpLevels,
          protectiveStop,
          rationale: [
            ...context,
            `Reversal Scalping Mode active: ${scalpTriggerReason} during downtrend.`,
            macroVerdict === 'bullish'
              ? '1h Macro Trend is bullish — scalp operates with higher timeframe support.'
              : 'Executing quick-profit scalp order with tight risk controls.',
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
      const scalpLevels = buildScalpLevels(price, macroVerdict)
      const macroTag =
        macroVerdict === 'bullish'
          ? ' (1h Macro Aligned)'
          : macroVerdict === 'bearish'
          ? ' (Counter-Macro)'
          : ''
      return {
        action: 'BUY',
        gate: 'scalp-open',
        headline: scalpLevels
          ? `Intraday Scalp Bounce${macroTag} ~${money(scalpLevels.entry)} · tight stop ${money(
              scalpLevels.stopLoss,
            )} · target ${money(scalpLevels.takeProfit)} (+${scalpLevels.targetDistancePct}%)`
          : 'Intraday Scalp Long at market',
        forFlat: scalpLevels
          ? `Quick scalp: ${scalpTriggerReason} detected. Buy near ${money(scalpLevels.entry)}, target ${money(
              scalpLevels.takeProfit,
            )} (+${scalpLevels.targetDistancePct}%).`
          : 'Quick scalp on bullish reversal pattern.',
        forHolder:
          macroVerdict === 'bullish'
            ? 'Macro 1h is bullish — scalp with trailing stop.'
            : 'Take fast profit at target; overall macro trend is still downward.',
        levels: scalpLevels,
        protectiveStop,
        rationale: [
          ...context,
          `Reversal Scalping Mode: ${scalpTriggerReason} detected despite negative composite ${score}.`,
          `Targeting quick +${scalpLevels?.targetDistancePct ?? config.scalp.targetDistancePct}% profit with tight stop −${config.scalp.stopDistancePct}%.`,
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
    const scalpLevels = buildScalpLevels(price, macroVerdict)
    const macroTag =
      macroVerdict === 'bullish'
        ? ' (1h Macro Aligned)'
        : macroVerdict === 'bearish'
        ? ' (Counter-Macro)'
        : ''
    return {
      action: 'BUY',
      gate: 'scalp-open',
      headline: scalpLevels
        ? `Intraday Scalp Long${macroTag} ~${money(scalpLevels.entry)} · stop ${money(
            scalpLevels.stopLoss,
          )} · target ${money(scalpLevels.takeProfit)} (+${scalpLevels.targetDistancePct}%)`
        : 'Intraday Scalp Long at market',
      forFlat: scalpLevels
        ? `Scalp bounce: ${scalpTriggerReason} in neutral range. Enter near ${money(scalpLevels.entry)}, stop ${money(
            scalpLevels.stopLoss,
          )}, target ${money(scalpLevels.takeProfit)} (+${scalpLevels.targetDistancePct}%).`
        : 'Enter scalp long on bullish candle bounce.',
      forHolder:
        macroVerdict === 'bullish'
          ? '1h Macro is bullish — hold and trail stop for expansion.'
          : 'Hold and take profit at scalp target.',
      levels: scalpLevels,
      protectiveStop,
      rationale: [
        ...context,
        `Reversal Scalp triggered in neutral market: ${scalpTriggerReason}.`,
        macroVerdict === 'bullish'
          ? `1h Macro trend is bullish — aligned with higher timeframe flow. Aiming for +${scalpLevels?.targetDistancePct}%.`
          : `Aiming for intraday gain of +${scalpLevels?.targetDistancePct ?? config.scalp.targetDistancePct}%.`,
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
