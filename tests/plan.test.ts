import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import type { IndicatorBundle } from '@/lib/indicators'
import { buildTradePlan, isActionable, shouldAlert, trendRead } from '@/lib/signal/plan'
import type { ConfluenceInfo, RegimeInfo } from '@/lib/types'

/** Full bundle with only the trend-group members filled in. */
function bundleWith(overrides: Partial<IndicatorBundle>): IndicatorBundle {
  return {
    ichimoku: null,
    macd: null,
    emaTrend: null,
    supertrend: null,
    bollinger: null,
    rsi: null,
    stochRsi: null,
    vwap: null,
    volume: null,
    patterns: null,
    adx: null,
    atr: null,
    ...overrides,
  } as IndicatorBundle
}

const bearishEma = {
  emaFast: 1900,
  emaMid: 1950,
  emaSlow: 1990,
  alignment: 'bearish' as const,
  cross: null,
  score: -100,
  detail: 'EMAs stacked bearish',
}

const bullishEma = { ...bearishEma, alignment: 'bullish' as const, score: 100 }
const mixedEma = { ...bearishEma, alignment: 'mixed' as const, score: 0 }

const belowCloud = {
  conversion: 1900,
  base: 1950,
  spanA: 1960,
  spanB: 1970,
  priceVsCloud: 'below' as const,
  tkRelation: 'bearish' as const,
  recentCross: null,
  score: -75,
  detail: 'Price below the cloud',
}

const insideCloud = { ...belowCloud, priceVsCloud: 'inside' as const, score: 0 }
const aboveCloud = { ...belowCloud, priceVsCloud: 'above' as const, score: 75 }

const macdBelow = {
  macd: -5,
  signal: -3,
  histogram: -2,
  zeroLine: 'below' as const,
  freshCross: null,
  score: -40,
  detail: 'MACD below zero',
}
const macdAbove = { ...macdBelow, zeroLine: 'above' as const, score: 40 }

describe('trendRead', () => {
  it('reads a bearish trend when the whole trend group points down', () => {
    const read = trendRead(
      bundleWith({ emaTrend: bearishEma, ichimoku: belowCloud, macd: macdBelow }),
    )
    expect(read.verdict).toBe('down')
    expect(read.evidence.length).toBeGreaterThanOrEqual(3)
  })

  it('reads a bullish trend when the whole trend group points up', () => {
    const read = trendRead(
      bundleWith({ emaTrend: bullishEma, ichimoku: aboveCloud, macd: macdAbove }),
    )
    expect(read.verdict).toBe('up')
  })

  it('is neutral when the trend group disagrees', () => {
    const read = trendRead(
      bundleWith({ emaTrend: mixedEma, ichimoku: insideCloud, macd: macdAbove }),
    )
    expect(read.verdict).toBe('neutral')
  })

  it('is neutral when the trend group is missing entirely', () => {
    expect(trendRead(bundleWith({})).verdict).toBe('neutral')
  })
})

const regime: RegimeInfo = {
  adx: 30,
  regime: 'trending',
  direction: 'bearish',
  atrPct: 0.5,
  atrValue: 10,
  volatilityRatio: 1,
  thresholdMultiplier: 1,
  tilt: 'trend',
  detail: 'ADX 30 — trending',
}

const bullishRegime: RegimeInfo = { ...regime, direction: 'bullish' }

const confluence: ConfluenceInfo = {
  bullish: 1,
  bearish: 1,
  agreeing: 1,
  conflicting: 1,
  multiplier: 1,
  verdict: 'mixed',
  detail: 'Mixed signals',
}

describe('buildTradePlan', () => {
  it('derives entry, stop and target from ATR with the configured multiples', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime: bullishRegime,
      confluence,
      trend: { verdict: 'up', evidence: ['EMAs stacked bullish'] },
    })

    expect(plan.action).toBe('BUY')
    expect(plan.gate).toBe('open')
    expect(plan.levels).not.toBeNull()

    // stop = price - atr * stopAtrMultiple = 2000 - 15
    expect(plan.levels!.stopLoss).toBe(2000 - 10 * config.trade.stopAtrMultiple)
    // target = price + risk * rewardMultiple = 2000 + 15 * 2
    expect(plan.levels!.takeProfit).toBe(2000 + 10 * config.trade.stopAtrMultiple * config.trade.rewardMultiple)
    expect(plan.levels!.riskReward).toBe(config.trade.rewardMultiple)
    expect(plan.levels!.stopDistancePct).toBeCloseTo(
      ((10 * config.trade.stopAtrMultiple) / 2000) * 100,
      2,
    )
  })

  it('refuses to BUY into a confirmed bearish trend', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime,
      confluence,
      trend: { verdict: 'down', evidence: ['EMAs stacked bearish'] },
    })

    expect(plan.action).toBe('STAY_OUT')
    expect(plan.gate).toBe('blocked-by-trend')
    expect(plan.levels).toBeNull()
    // A holder still gets a protective stop.
    expect(plan.protectiveStop).toBe(2000 - 10 * config.trade.stopAtrMultiple)
    expect(plan.rationale.join(' ')).toContain('trend gate is closed')
  })

  it('allows a counter-trend BUY when the regime is ranging', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime: { ...regime, regime: 'ranging' },
      confluence,
      trend: { verdict: 'down', evidence: ['EMAs stacked bearish'] },
    })

    expect(plan.action).toBe('BUY')
    expect(plan.gate).toBe('open')
  })

  it('tells a holder to sell on a SHORT signal', () => {
    const plan = buildTradePlan({
      direction: 'SHORT',
      price: 2000,
      score: -50,
      regime,
      confluence,
      trend: { verdict: 'down', evidence: ['EMAs stacked bearish'] },
    })

    expect(plan.action).toBe('SELL')
    expect(plan.forHolder).toContain('Exit')
    expect(plan.levels).toBeNull()
  })

  it('stays out with no edge in the neutral band', () => {
    const plan = buildTradePlan({
      direction: 'NEUTRAL',
      price: 2000,
      score: 3,
      regime,
      confluence,
      trend: { verdict: 'neutral', evidence: [] },
    })

    expect(plan.action).toBe('STAY_OUT')
    expect(plan.gate).toBe('no-edge')
    expect(plan.levels).toBeNull()
    expect(plan.protectiveStop).not.toBeNull()
  })

  it('omits levels when ATR is unavailable', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime: { ...bullishRegime, atrValue: null },
      confluence,
      trend: { verdict: 'up', evidence: [] },
    })

    expect(plan.action).toBe('BUY')
    expect(plan.levels).toBeNull()
    expect(plan.protectiveStop).toBeNull()
    expect(plan.headline).toContain('market')
  })

  it('refuses to BUY when 15m trend is up but 1h macro trend is bearish', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime: bullishRegime,
      confluence,
      trend: { verdict: 'up', evidence: ['EMAs stacked bullish'] },
      macroTrend: {
        timeframe: '1h',
        verdict: 'bearish',
        supertrendDirection: 'bearish',
        supertrendValue: 2050,
        emaAlignment: 'bearish',
        alignmentWithSignal: 'counter-trend',
        detail: '1h SuperTrend bearish · 1h EMAs stacked bearish',
      },
      reversalScalpMode: false,
    })

    expect(plan.action).toBe('STAY_OUT')
    expect(plan.gate).toBe('blocked-by-trend')
    expect(plan.headline).toContain('blocked by 1h bearish macro trend')
    expect(plan.rationale.join(' ')).toContain('1h macro trend is bearish')
  })

  it('executes a tight counter-macro scalp when reversalScalpMode is enabled during 1h bearish trend', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime: bullishRegime,
      confluence,
      trend: { verdict: 'up', evidence: ['EMAs stacked bullish'] },
      macroTrend: {
        timeframe: '1h',
        verdict: 'bearish',
        supertrendDirection: 'bearish',
        supertrendValue: 2050,
        emaAlignment: 'bearish',
        alignmentWithSignal: 'counter-trend',
        detail: '1h SuperTrend bearish',
      },
      reversalScalpMode: true,
    })

    expect(plan.action).toBe('BUY')
    expect(plan.gate).toBe('scalp-open')
    expect(plan.headline).toContain('Counter-Macro Scalp')
    expect(plan.levels).not.toBeNull()
    expect(plan.levels?.stagedTargets?.[0]?.action).toBe('breakeven-stop')
  })

  it('records macro alignment when 1h macro trend is bullish and 15m is LONG', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime: bullishRegime,
      confluence,
      trend: { verdict: 'up', evidence: ['EMAs stacked bullish'] },
      macroTrend: {
        timeframe: '1h',
        verdict: 'bullish',
        supertrendDirection: 'bullish',
        supertrendValue: 1950,
        emaAlignment: 'bullish',
        alignmentWithSignal: 'aligned',
        detail: '1h SuperTrend bullish · 1h EMAs stacked bullish',
      },
    })

    expect(plan.action).toBe('BUY')
    expect(plan.gate).toBe('open')
    expect(plan.rationale.join(' ')).toContain('🎯 1h Macro Trend is aligned')
  })

  it('adapts levels for 1m High-Frequency Scalping with tight 0.4% stop', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime: bullishRegime,
      confluence,
      trend: { verdict: 'down', evidence: ['EMAs down'] },
      macroTrend: {
        timeframe: '15m',
        verdict: 'bearish',
        supertrendDirection: 'bearish',
        supertrendValue: 2020,
        emaAlignment: 'bearish',
        alignmentWithSignal: 'counter-trend',
        detail: '15m SuperTrend bearish',
      },
      reversalScalpMode: true,
      timeframe: '1m',
    })

    expect(plan.action).toBe('BUY')
    expect(plan.gate).toBe('scalp-open')
    expect(plan.headline).toContain('High-Freq Scalp')
    expect(plan.levels).not.toBeNull()
    expect(plan.levels?.stopDistancePct).toBe(0.4)
  })

  it('adapts levels for 1h/4h Swing Trading with wider multi-day reward targets', () => {
    const plan = buildTradePlan({
      direction: 'LONG',
      price: 2000,
      score: 50,
      regime: bullishRegime,
      confluence,
      trend: { verdict: 'up', evidence: ['EMAs stacked bullish'] },
      macroTrend: {
        timeframe: '4h',
        verdict: 'bullish',
        supertrendDirection: 'bullish',
        supertrendValue: 1850,
        emaAlignment: 'bullish',
        alignmentWithSignal: 'aligned',
        detail: '4h SuperTrend bullish',
      },
      timeframe: '1h',
    })

    expect(plan.action).toBe('BUY')
    expect(plan.gate).toBe('open')
    expect(plan.levels).not.toBeNull()
    expect(plan.levels?.riskReward).toBe(2.8)
    expect(plan.rationale.join(' ')).toContain('🎯 4h Macro Trend is aligned')
  })
})

describe('isActionable', () => {
  it('treats only BUY and SELL as requiring action', () => {
    expect(isActionable('BUY')).toBe(true)
    expect(isActionable('SELL')).toBe(true)
    expect(isActionable('STAY_OUT')).toBe(false)
    expect(isActionable('HOLD')).toBe(false)
  })
})

describe('shouldAlert', () => {
  it('stays quiet on a fresh STAY_OUT but alerts on a fresh BUY', () => {
    expect(shouldAlert(null, 'STAY_OUT')).toBe(false)
    expect(shouldAlert(null, 'HOLD')).toBe(false)
    expect(shouldAlert(null, 'BUY')).toBe(true)
    expect(shouldAlert(null, 'SELL')).toBe(true)
  })

  it('alerts whenever the action changes', () => {
    expect(shouldAlert('STAY_OUT', 'BUY')).toBe(true)
    expect(shouldAlert('BUY', 'STAY_OUT')).toBe(true)
    expect(shouldAlert('BUY', 'SELL')).toBe(true)
    expect(shouldAlert('SELL', 'STAY_OUT')).toBe(true)
  })

  it('stays quiet when the action is unchanged', () => {
    expect(shouldAlert('BUY', 'BUY')).toBe(false)
    expect(shouldAlert('STAY_OUT', 'STAY_OUT')).toBe(false)
  })
})
