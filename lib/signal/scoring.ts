import { config } from '@/lib/config'
import type { IndicatorBundle } from '@/lib/indicators'
import type {
  ConfluenceInfo,
  IndicatorGroup,
  IndicatorScore,
  RegimeInfo,
  TrendRegime,
} from '@/lib/types'
import { round } from '@/lib/utils'

export type ScoringResult = {
  /** Composite score in [-100, +100], after regime tilt and confluence. */
  composite: number
  indicators: IndicatorScore[]
  regime: RegimeInfo
  confluence: ConfluenceInfo
  reasons: string[]
}

type Definition = {
  key: IndicatorScore['key']
  label: string
  group: IndicatorGroup
  raw: number
  detail: string
  meta?: Record<string, unknown>
}

/** How much to scale a group's weight given the current ADX regime. */
function tiltFactor(group: IndicatorGroup, regime: TrendRegime): number {
  const r = config.regime
  if (group === 'neutral' || regime === 'unknown' || regime === 'transitioning') return 1
  if (regime === 'trending') {
    return group === 'trend' ? r.trendTilt : r.meanReversionTilt
  }
  return group === 'trend' ? r.rangingTrendTilt : r.rangingMeanReversionTilt
}

function buildRegime(bundle: IndicatorBundle): RegimeInfo {
  const adxResult = bundle.adx
  const atrResult = bundle.atr

  const regime: TrendRegime = adxResult?.regime ?? 'unknown'
  const tilt: RegimeInfo['tilt'] =
    regime === 'trending' ? 'trend' : regime === 'ranging' ? 'mean-reversion' : 'neutral'

  const atrPct = atrResult?.atrPct ?? null
  const atrValue = atrResult?.atr ?? null
  const volatilityRatio = atrResult?.volatilityRatio ?? null
  const thresholdMultiplier = atrResult?.thresholdMultiplier ?? 1

  const parts: string[] = []
  parts.push(
    adxResult
      ? `ADX ${adxResult.adx} — ${regime} (${adxResult.direction} pressure)`
      : 'ADX unavailable — weights untilted',
  )
  if (atrPct != null) {
    parts.push(
      `ATR ${atrPct}% of price` +
        (volatilityRatio != null ? ` (${round(volatilityRatio, 2)}× its median)` : ''),
    )
  }
  if (tilt === 'trend') parts.push('trend indicators up-weighted, mean-reversion dampened')
  else if (tilt === 'mean-reversion') parts.push('mean-reversion up-weighted, trend dampened')

  return {
    adx: adxResult?.adx ?? null,
    regime,
    direction: adxResult?.direction ?? 'unknown',
    atrPct,
    atrValue,
    volatilityRatio,
    thresholdMultiplier,
    tilt,
    detail: parts.join(' · '),
  }
}

function buildConfluence(entries: IndicatorScore[]): ConfluenceInfo {
  const c = config.confluence

  const bullish = entries.filter((e) => e.raw >= c.agreeThreshold).length
  const bearish = entries.filter((e) => e.raw <= -c.agreeThreshold).length
  const agreeing = Math.max(bullish, bearish)
  const conflicting = Math.min(bullish, bearish)

  let verdict: ConfluenceInfo['verdict'] = 'mixed'
  let multiplier = 1

  if (conflicting >= c.conflictDampenCount) {
    verdict = 'conflict'
    multiplier = c.conflictDampen
  } else if (agreeing >= c.strongAgreementCount) {
    verdict = 'strong-agreement'
    multiplier = c.agreementBoost
  }

  const detail =
    verdict === 'strong-agreement'
      ? `${agreeing} of ${entries.length} indicators agree (${bullish} bullish / ${bearish} bearish) — boosted ×${multiplier}`
      : verdict === 'conflict'
        ? `Indicators conflict (${bullish} bullish / ${bearish} bearish) — dampened ×${multiplier}`
        : `Mixed signals (${bullish} bullish / ${bearish} bearish) — no adjustment`

  return { bullish, bearish, agreeing, conflicting, multiplier, verdict, detail }
}

/**
 * Combine every available indicator into one weighted composite score.
 *
 * Three things happen here, in order:
 *  1. **Regime tilt** — ADX decides whether the trend-following or the
 *     mean-reversion indicators carry more weight right now.
 *  2. **Renormalisation** — weights are rescaled over the indicators that
 *     actually produced a value, so a missing indicator cannot silently drag
 *     the composite toward zero.
 *  3. **Confluence** — the composite is boosted when the indicators broadly
 *     agree and dampened when they fight each other.
 */
export function scoreIndicators(bundle: IndicatorBundle): ScoringResult {
  const regime = buildRegime(bundle)

  const definitions: Definition[] = []

  const add = (
    key: Definition['key'],
    label: string,
    group: IndicatorGroup,
    raw: number,
    detail: string,
    meta?: Record<string, unknown>,
  ) => definitions.push({ key, label, group, raw, detail, meta })

  if (bundle.ichimoku) {
    add('ichimoku', 'Ichimoku Cloud', 'trend', bundle.ichimoku.score, bundle.ichimoku.detail, {
      priceVsCloud: bundle.ichimoku.priceVsCloud,
      tkRelation: bundle.ichimoku.tkRelation,
      recentCross: bundle.ichimoku.recentCross,
    })
  }
  if (bundle.macd) {
    add('macd', 'MACD (12/26/9)', 'trend', bundle.macd.score, bundle.macd.detail, {
      histogram: bundle.macd.histogram,
      zeroLine: bundle.macd.zeroLine,
      freshCross: bundle.macd.freshCross,
    })
  }
  if (bundle.emaTrend) {
    add('emaTrend', 'EMA Trend (20/50/200)', 'trend', bundle.emaTrend.score, bundle.emaTrend.detail, {
      alignment: bundle.emaTrend.alignment,
      cross: bundle.emaTrend.cross,
    })
  }
  if (bundle.supertrend) {
    add('supertrend', 'SuperTrend (10/3)', 'trend', bundle.supertrend.score, bundle.supertrend.detail, {
      direction: bundle.supertrend.direction,
      value: bundle.supertrend.value,
      flipped: bundle.supertrend.flipped,
      barsSinceFlip: bundle.supertrend.barsSinceFlip,
      distancePct: bundle.supertrend.distancePct,
    })
  }
  if (bundle.bollinger) {
    add('bollinger', 'Bollinger Bands', 'mean-reversion', bundle.bollinger.score, bundle.bollinger.detail, {
      percentB: bundle.bollinger.percentB,
      squeeze: bundle.bollinger.squeeze,
    })
  }
  if (bundle.rsi) {
    add('rsi', 'RSI (14)', 'mean-reversion', bundle.rsi.score, bundle.rsi.detail, {
      value: bundle.rsi.value,
      divergence: bundle.rsi.divergence,
    })
  }
  if (bundle.stochRsi) {
    add('stochRsi', 'Stochastic RSI', 'mean-reversion', bundle.stochRsi.score, bundle.stochRsi.detail, {
      k: bundle.stochRsi.k,
      d: bundle.stochRsi.d,
    })
  }
  if (bundle.vwap) {
    add('vwap', 'VWAP (24h)', 'mean-reversion', bundle.vwap.score, bundle.vwap.detail, {
      vwap: bundle.vwap.vwap,
      deviationPct: bundle.vwap.deviationPct,
    })
  }
  if (bundle.volume) {
    add('volume', 'Volume / OBV', 'neutral', bundle.volume.score, bundle.volume.detail, {
      divergence: bundle.volume.divergence,
      volumeRatio: bundle.volume.volumeRatio,
    })
  }
  if (bundle.patterns) {
    add('pattern', 'Candlestick Patterns', 'neutral', bundle.patterns.score, bundle.patterns.detail, {
      detected: bundle.patterns.patterns.map((p) => p.kind),
    })
  }

  if (definitions.length === 0) {
    return {
      composite: 0,
      indicators: [],
      regime,
      confluence: buildConfluence([]),
      reasons: ['Not enough data to score indicators'],
    }
  }

  // --- 1 + 2: apply the regime tilt, then renormalise over what we have ---
  const entries: IndicatorScore[] = definitions.map((d) => ({
    key: d.key,
    label: d.label,
    group: d.group,
    raw: round(d.raw, 1),
    baseWeight: config.weights[d.key],
    weight: 0,
    contribution: 0,
    detail: d.detail,
    meta: d.meta,
  }))

  let totalWeight = 0
  for (const entry of entries) {
    entry.weight = entry.baseWeight * tiltFactor(entry.group, regime.regime)
    totalWeight += entry.weight
  }

  let composite = 0
  for (const entry of entries) {
    const normalised = entry.weight / totalWeight
    entry.weight = round(normalised, 4)
    entry.contribution = round(entry.raw * normalised, 2)
    composite += entry.contribution
  }

  // --- 3: confluence boost / dampening ---
  const confluence = buildConfluence(entries)
  composite = round(Math.max(-100, Math.min(100, composite * confluence.multiplier)), 1)

  const reasons: string[] = []
  reasons.push(regime.detail)
  reasons.push(confluence.detail)
  for (const entry of entries) {
    if (Math.abs(entry.contribution) >= 5) {
      reasons.push(
        `${entry.label}: ${entry.detail} (${entry.contribution > 0 ? '+' : ''}${entry.contribution})`,
      )
    }
  }

  return { composite, indicators: entries, regime, confluence, reasons }
}

