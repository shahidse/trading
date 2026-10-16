import { OBV } from 'technicalindicators'
import type { Candle } from '@/lib/types'
import { average, clamp, round } from '@/lib/utils'

export type VolumeResult = {
  obvChange: number
  priceChangePct: number
  volumeRatio: number
  divergence: 'bullish' | 'bearish' | null
  score: number
  detail: string
}

/**
 * Volume confirmation via On-Balance Volume + volume spikes.
 *
 * The reading is whether OBV moved *with* price:
 *  - price and OBV both up  → volume confirms the advance (+60)
 *  - price and OBV both down → volume confirms the decline (-60)
 *  - price up but OBV down  → bearish divergence (-50)
 *  - price down but OBV up  → bullish divergence (+50)
 *
 * A volume spike (last bar above `spikeRatio` × average) amplifies the reading
 * by 30%, because confirmation on heavy volume is more meaningful.
 */
export function volume(candles: Candle[], opts = { lookback: 20, spikeRatio: 1.5 }): VolumeResult | null {
  if (candles.length < opts.lookback + 5) return null

  const close = candles.map((c) => c.close)
  const volumes = candles.map((c) => c.volume)

  const obv = OBV.calculate({ close, volume: volumes })
  if (obv.length < opts.lookback + 1) return null

  const obvNow = obv[obv.length - 1]
  const obvThen = obv[obv.length - 1 - opts.lookback]
  const priceNow = close[close.length - 1]
  const priceThen = close[close.length - 1 - opts.lookback]

  const priceChangePct = priceThen === 0 ? 0 : ((priceNow - priceThen) / priceThen) * 100
  const obvChange = obvNow - obvThen

  const priceUp = priceNow > priceThen
  const obvUp = obvNow > obvThen

  let score: number
  let divergence: VolumeResult['divergence'] = null

  if (priceUp === obvUp) {
    score = priceUp ? 60 : -60
  } else {
    divergence = priceUp ? 'bearish' : 'bullish'
    score = priceUp ? -50 : 50
  }

  const priorVolumes = volumes.slice(-opts.lookback - 1, -1)
  const avgVolume = average(priorVolumes)
  const lastVolume = volumes[volumes.length - 1]
  const volumeRatio = avgVolume > 0 ? lastVolume / avgVolume : 1

  const spike = volumeRatio >= opts.spikeRatio
  if (spike) score *= 1.3

  score = clamp(score)

  let detail: string
  if (divergence === 'bullish') detail = 'Bullish OBV divergence — price down, volume up'
  else if (divergence === 'bearish') detail = 'Bearish OBV divergence — price up, volume down'
  else if (priceUp) detail = 'Volume confirms the advance'
  else detail = 'Volume confirms the decline'
  if (spike) detail += ` · volume spike (${round(volumeRatio, 1)}× avg)`

  return {
    obvChange: round(obvChange, 2),
    priceChangePct: round(priceChangePct, 2),
    volumeRatio: round(volumeRatio, 2),
    divergence,
    score: round(score, 1),
    detail,
  }
}
