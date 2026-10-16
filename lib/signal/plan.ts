import { config } from '@/lib/config'
import type { IndicatorBundle } from '@/lib/indicators'
import type {
  ConfluenceInfo,
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
}

/**
 * Turn a directional signal into something you can actually act on:
 * enter / hold / sell, plus the price levels that define the risk.
 */
export function buildTradePlan(input: TradePlanInput): TradePlan {
  const { direction, price, score, regime, confluence, trend } = input
  const atrValue = regime.atrValue

  const protectiveStop =
    atrValue && atrValue > 0 && price > 0
      ? round(price - atrValue * config.trade.stopAtrMultiple, 2)
      : null

  const context: string[] = [regime.detail, confluence.detail]

  // ---------- LONG ----------
  if (direction === 'LONG') {
    /**
     * Safety net, not the main defence. Measured: this fired 0 times across
     * 1790 backtested bars, even when broadened to include ADX-confirmed
     * downside pressure. The reason is structural — the ADX regime tilt already
     * halves mean-reversion weights in a trend, so a composite rarely reaches
     * LONG while the trend group points down. Kept because it costs nothing and
     * guards the residual case.
     */
    const counterTrend =
      config.trade.blockCounterTrend &&
      regime.regime !== 'ranging' &&
      (trend.verdict === 'down' ||
        (regime.regime === 'trending' && regime.direction === 'bearish'))

    if (counterTrend) {
      return {
        action: 'STAY_OUT',
        gate: 'blocked-by-trend',
        headline: 'Do not buy — bullish score blocked by a bearish trend',
        forFlat:
          'Stay out. Wait for the trend group (EMA stack / cloud / MACD) to stop pointing down.',
        forHolder: 'Consider trimming. Do not add to this position.',
        levels: null,
        protectiveStop,
        rationale: [
          ...context,
          `Composite is bullish (${score}) but the trend gate is closed: ${trend.evidence.join(', ')}.`,
          'This is the exact situation that produced the low backtest win rate — mean-reversion indicators calling a bottom in a downtrend.',
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
