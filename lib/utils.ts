/** Small numeric helpers shared across the analysis pipeline. */

export function clamp(value: number, min = -100, max = 100): number {
  if (Number.isNaN(value)) return 0
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Percentile rank (0..1) of the last value within the given series. */
export function percentileRank(series: number[], value: number): number {
  if (series.length === 0) return 0
  const below = series.filter((v) => v <= value).length
  return below / series.length
}

/** Average of a numeric array, 0 when empty. */
export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}
