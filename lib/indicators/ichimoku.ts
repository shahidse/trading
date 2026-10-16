import { IchimokuCloud } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { clamp, round } from '@/lib/utils'

export type IchimokuResult = {
  conversion: number
  base: number
  spanA: number
  spanB: number
  /** 'above' | 'below' | 'inside' — price relative to the cloud. */
  priceVsCloud: 'above' | 'below' | 'inside'
  /** Tenkan-sen vs Kijun-sen relationship. */
  tkRelation: 'bullish' | 'bearish'
  /** True when a Tenkan/Kijun cross happened within the last 3 bars. */
  recentCross: 'bullish' | 'bearish' | null
  score: number
  detail: string
}

/**
 * Ichimoku Cloud (9 / 26 / 52, displacement 26).
 *
 * Weighted components:
 *  - price vs cloud (±40)
 *  - Tenkan vs Kijun (±35)
 *  - fresh TK cross (±25)
 */
export function ichimoku(
  candles: Candle[],
  opts = {
    conversionPeriod: 9,
    basePeriod: 26,
    spanPeriod: 52,
    displacement: 26,
  },
): IchimokuResult | null {
  const high = candles.map((c) => c.high)
  const low = candles.map((c) => c.low)
  const minBars = opts.spanPeriod + opts.displacement + 1
  if (candles.length < minBars) return null

  const series = IchimokuCloud.calculate({
    high,
    low,
    conversionPeriod: opts.conversionPeriod,
    basePeriod: opts.basePeriod,
    spanPeriod: opts.spanPeriod,
    displacement: opts.displacement,
  })
  if (series.length < 4) return null

  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  const close = candles[candles.length - 1].close

  // --- Price relative to the cloud ---
  const cloudTop = Math.max(last.spanA, last.spanB)
  const cloudBottom = Math.min(last.spanA, last.spanB)
  let cloudScore = 0
  let priceVsCloud: IchimokuResult['priceVsCloud']
  if (close > cloudTop) {
    cloudScore = 40
    priceVsCloud = 'above'
  } else if (close < cloudBottom) {
    cloudScore = -40
    priceVsCloud = 'below'
  } else {
    cloudScore = 0
    priceVsCloud = 'inside'
  }

  // --- Tenkan / Kijun ---
  const tkRelation: IchimokuResult['tkRelation'] =
    last.conversion >= last.base ? 'bullish' : 'bearish'
  const tkScore = tkRelation === 'bullish' ? 35 : -35

  // --- Fresh cross within the last 3 bars ---
  let recentCross: IchimokuResult['recentCross'] = null
  const tail = series.slice(-4)
  for (let i = 1; i < tail.length; i++) {
    const up = tail[i - 1].conversion <= tail[i - 1].base && tail[i].conversion > tail[i].base
    const down = tail[i - 1].conversion >= tail[i - 1].base && tail[i].conversion < tail[i].base
    if (up) recentCross = 'bullish'
    else if (down) recentCross = 'bearish'
  }
  // Only count a cross made on the most recent bars.
  const crossedUp = prev.conversion <= prev.base && last.conversion > last.base
  const crossedDown = prev.conversion >= prev.base && last.conversion < last.base
  if (crossedUp) recentCross = 'bullish'
  else if (crossedDown) recentCross = 'bearish'
  const crossScore = recentCross === 'bullish' ? 25 : recentCross === 'bearish' ? -25 : 0

  const score = clamp(cloudScore + tkScore + crossScore)

  const cloudLabel =
    priceVsCloud === 'above'
      ? 'Price above the cloud'
      : priceVsCloud === 'below'
        ? 'Price below the cloud'
        : 'Price inside the cloud'
  let detail = `${cloudLabel} · Tenkan ${tkRelation === 'bullish' ? '>' : '<'} Kijun`
  if (recentCross) detail += ` · recent ${recentCross} TK cross`

  return {
    conversion: round(last.conversion),
    base: round(last.base),
    spanA: round(last.spanA),
    spanB: round(last.spanB),
    priceVsCloud,
    tkRelation,
    recentCross,
    score: round(score, 1),
    detail,
  }
}
