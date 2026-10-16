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

/**
 * Read a fetch response as JSON, turning non-JSON bodies (an HTML error page,
 * an empty response) into a readable Error instead of a raw
 * "Unexpected token '<' is not valid JSON".
 */
export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) throw new Error(`Empty response (HTTP ${response.status})`)

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Unexpected non-JSON response (HTTP ${response.status})`)
  }

  if (!response.ok) {
    const message = (parsed as { error?: string } | null)?.error
    throw new Error(message ?? `Request failed (HTTP ${response.status})`)
  }

  return parsed as T
}
