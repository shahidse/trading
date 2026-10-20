import { config } from '@/lib/config'
import type { Candle } from '@/lib/types'
import { adx, type AdxResult } from './adx'
import { atr, type AtrResult } from './atr'
import { bollinger, type BollingerResult } from './bollinger'
import { emaTrend, type EmaTrendResult } from './ema-trend'
import { ichimoku, type IchimokuResult } from './ichimoku'
import { macd, type MacdResult } from './macd'
import { patterns, type PatternResult } from './patterns'
import { rsi, type RsiResult } from './rsi'
import { stochRsi, type StochRsiResult } from './stoch-rsi'
import { supertrend, type SuperTrendResult } from './supertrend'
import { volume, type VolumeResult } from './volume'
import { vwap, type VwapResult } from './vwap'

export type IndicatorBundle = {
  // Directional — contribute to the composite score
  ichimoku: IchimokuResult | null
  macd: MacdResult | null
  emaTrend: EmaTrendResult | null
  supertrend: SuperTrendResult | null
  bollinger: BollingerResult | null
  rsi: RsiResult | null
  stochRsi: StochRsiResult | null
  vwap: VwapResult | null
  volume: VolumeResult | null
  patterns: PatternResult | null
  // Contextual — do not score; they shape how the score is interpreted
  adx: AdxResult | null
  atr: AtrResult | null
}

export { adx, atr, bollinger, emaTrend, ichimoku, macd, patterns, rsi, stochRsi, supertrend, volume, vwap }
export type {
  AdxResult,
  AtrResult,
  BollingerResult,
  EmaTrendResult,
  IchimokuResult,
  MacdResult,
  PatternResult,
  RsiResult,
  StochRsiResult,
  SuperTrendResult,
  VolumeResult,
  VwapResult,
}

/** Run every indicator over the candle series in one pass. */
export function computeIndicators(candles: Candle[]): IndicatorBundle {
  return {
    ichimoku: ichimoku(candles, config.ichimoku),
    macd: macd(candles, config.macd),
    emaTrend: emaTrend(candles, config.emaTrend),
    supertrend: supertrend(candles, config.supertrend),
    bollinger: bollinger(candles, config.bollinger.period, config.bollinger.stdDev),
    rsi: rsi(candles, config.rsi.period),
    stochRsi: stochRsi(candles, config.stochRsi),
    vwap: vwap(candles, config.vwap),
    volume: volume(candles, config.volume),
    patterns: patterns(candles),
    adx: adx(candles, {
      period: config.regime.period,
      trendingThreshold: config.regime.trendingThreshold,
      rangingThreshold: config.regime.rangingThreshold,
    }),
    atr: atr(candles, config.atr),
  }
}


