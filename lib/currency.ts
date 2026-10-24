/**
 * USD to PKR (Pakistani Rupee) Currency Conversion & Valuation Service.
 *
 * Provides real-time currency conversion rates, caching, and dual-currency
 * formatting across all asset and trade values.
 */

let cachedRate: { rate: number; timestamp: number } | null = null
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const DEFAULT_PKR_RATE = 278.50

/**
 * Fetch live USD to PKR exchange rate from open API with resilient fallback.
 */
export async function getLivePkrRate(): Promise<number> {
  const now = Date.now()
  if (cachedRate && now - cachedRate.timestamp < CACHE_TTL_MS) {
    return cachedRate.rate
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(4000),
    })

    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> }
      if (data.rates?.PKR && Number.isFinite(data.rates.PKR) && data.rates.PKR > 100) {
        const rate = Math.round(data.rates.PKR * 100) / 100
        cachedRate = { rate, timestamp: now }
        return rate
      }
    }
  } catch {
    // Graceful fallback to default/cached rate
  }

  if (cachedRate) return cachedRate.rate
  return DEFAULT_PKR_RATE
}

/**
 * Format USD amount with standard precision.
 */
export function formatUsd(amount: number, compact = false): string {
  if (!Number.isFinite(amount)) return '$0.00'
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`
  }
  if (compact && Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`
  }

  if (amount < 0.0001 && amount > 0) {
    return `$${amount.toFixed(8)}`
  }
  if (amount < 0.01 && amount > 0) {
    return `$${amount.toFixed(6)}`
  }
  if (amount < 1 && amount > 0) {
    return `$${amount.toFixed(4)}`
  }

  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Format PKR amount with Pakistani Rupee symbol (₨).
 */
export function formatPkr(amountPkr: number, compact = false): string {
  if (!Number.isFinite(amountPkr)) return '₨ 0'
  if (compact && Math.abs(amountPkr) >= 10_000_000) {
    // 1 Crore = 10 Million
    return `₨ ${(amountPkr / 10_000_000).toFixed(2)} Cr`
  }
  if (compact && Math.abs(amountPkr) >= 100_000) {
    // 1 Lakh = 100 Thousand
    return `₨ ${(amountPkr / 100_000).toFixed(2)} Lac`
  }
  if (compact && Math.abs(amountPkr) >= 1_000) {
    return `₨ ${(amountPkr / 1_000).toFixed(1)}k`
  }

  return `₨ ${Math.round(amountPkr).toLocaleString('en-PK')}`
}

/**
 * Convert USD to PKR.
 */
export function usdToPkr(amountUsd: number, rate = DEFAULT_PKR_RATE): number {
  return amountUsd * rate
}

/**
 * Format in chosen active currency (USD or PKR).
 */
export function formatCurrency(
  amountUsd: number,
  currency: 'USD' | 'PKR',
  pkrRate = DEFAULT_PKR_RATE,
  compact = false,
): string {
  if (currency === 'PKR') {
    return formatPkr(usdToPkr(amountUsd, pkrRate), compact)
  }
  return formatUsd(amountUsd, compact)
}
