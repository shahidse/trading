import { describe, it, expect } from 'vitest'
import {
  formatUsd,
  formatPkr,
  usdToPkr,
  formatCurrency,
  DEFAULT_PKR_RATE,
  getLivePkrRate,
} from '@/lib/currency'

describe('lib/currency.ts', () => {
  it('converts USD to PKR with default rate', () => {
    const pkr = usdToPkr(100, 280)
    expect(pkr).toBe(28000)

    const defaultConverted = usdToPkr(10)
    expect(defaultConverted).toBe(10 * DEFAULT_PKR_RATE)
  })

  it('formats USD amounts correctly', () => {
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(1234.56)).toBe('$1,234.56')
    expect(formatUsd(1000000, true)).toBe('$1.00M')
    expect(formatUsd(5400, true)).toBe('$5.4k')
    expect(formatUsd(0.000045)).toBe('$0.00004500')
    expect(formatUsd(0.005)).toBe('$0.005000')
    expect(formatUsd(0.85)).toBe('$0.8500')
  })

  it('formats PKR amounts with Pakistani Lac & Crore compact notation', () => {
    expect(formatPkr(0)).toBe('₨ 0')
    expect(formatPkr(5000)).toBe('₨ 5,000')
    expect(formatPkr(25000000, true)).toBe('₨ 2.50 Cr') // 2.5 Crore
    expect(formatPkr(350000, true)).toBe('₨ 3.50 Lac') // 3.5 Lakh
    expect(formatPkr(8500, true)).toBe('₨ 8.5k')
  })

  it('formats currency according to chosen toggle (USD or PKR)', () => {
    const usdVal = formatCurrency(100, 'USD')
    expect(usdVal).toBe('$100.00')

    const pkrVal = formatCurrency(100, 'PKR', 278.5)
    expect(pkrVal).toBe('₨ 27,850')
  })

  it('fetches or falls back to valid PKR rate', async () => {
    const rate = await getLivePkrRate()
    expect(rate).toBeGreaterThan(100)
    expect(Number.isFinite(rate)).toBe(true)
  })
})
