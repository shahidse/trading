import type { Candle } from '@/lib/types'

const BASE_TIME = 1_700_000_000_000
const STEP_MS = 15 * 60 * 1000

/** Build a candle from explicit OHLC values. */
export function candle(
  open: number,
  high: number,
  low: number,
  close: number,
  index = 0,
): Candle {
  return {
    time: BASE_TIME + index * STEP_MS,
    open,
    high,
    low,
    close,
    volume: 100,
  }
}

/** Build a candle series from a list of closes (open = previous close). */
export function candlesFromCloses(closes: number[]): Candle[] {
  return closes.map((close, i) => {
    const open = i === 0 ? close : closes[i - 1]
    return candle(
      open,
      Math.max(open, close) + 0.5,
      Math.min(open, close) - 0.5,
      close,
      i,
    )
  })
}

/** Build the series from an explicit candle list. */
export function candlesFrom(list: Omit<Candle, 'time' | 'volume'>[]): Candle[] {
  return list.map((c, i) => ({ ...c, time: BASE_TIME + i * STEP_MS, volume: 100 }))
}
