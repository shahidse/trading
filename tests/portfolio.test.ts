import { describe, it, expect } from 'vitest'
import {
  savePortfolioSnapshot,
  getPortfolioSnapshots,
  getLatestPortfolioSnapshot,
} from '@/lib/db/client'

describe('Portfolio DB Client Functions', () => {
  it('saves and retrieves portfolio snapshots correctly', () => {
    const testTime = Date.now()
    const id = savePortfolioSnapshot({
      totalUsd: 12500.5,
      totalPkr: 3481389.25,
      pkrRate: 278.5,
      assetsBreakdown: JSON.stringify([{ asset: 'USDT', amount: 10000, usdValue: 10000 }]),
      environment: 'testnet',
      createdAt: testTime,
    })

    expect(id).toBeGreaterThan(0)

    const latest = getLatestPortfolioSnapshot()
    expect(latest).not.toBeNull()
    expect(latest?.totalUsd).toBeCloseTo(12500.5, 1)
    expect(latest?.pkrRate).toBeCloseTo(278.5, 1)

    const list = getPortfolioSnapshots(5)
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].id).toBe(latest?.id)
  })
})
