'use client'

import React, { useState, useMemo } from 'react'
import type { AssetBalance } from '@/lib/exchange/client'
import { Pagination } from '@/components/Pagination'

export type WalletAssetsCardProps = {
  balances?: AssetBalance[] | null
  testnet?: boolean
  ethPrice?: number | null
  onRefresh?: () => void
  loading?: boolean
}

const PAGE_SIZE = 20

export function WalletAssetsCard({
  balances,
  testnet = true,
  ethPrice = 0,
  onRefresh,
  loading = false,
}: WalletAssetsCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const activeBalances = useMemo(
    () => (balances || []).filter((b) => b.total > 0.00001),
    [balances],
  )

  // Filtered by search
  const filteredBalances = useMemo(() => {
    if (!searchQuery.trim()) return activeBalances
    const q = searchQuery.trim().toUpperCase()
    return activeBalances.filter((b) => b.asset.toUpperCase().includes(q))
  }, [activeBalances, searchQuery])

  // Paginated 20 records per page
  const paginatedBalances = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredBalances.slice(start, start + PAGE_SIZE)
  }, [filteredBalances, currentPage])

  // Calculate estimated total USD value
  let totalUsd = 0
  for (const b of activeBalances) {
    if (b.asset === 'USDT' || b.asset === 'BUSD' || b.asset === 'USDC') {
      totalUsd += b.total
    } else if (b.asset === 'ETH' && ethPrice) {
      totalUsd += b.total * ethPrice
    }
  }

  const usdtAsset = activeBalances.find((b) => b.asset === 'USDT')
  const ethAsset = activeBalances.find((b) => b.asset === 'ETH')

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 transition-all shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
            💰
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Exchange Assets</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  testnet
                    ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                    : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {testnet ? 'Spot Testnet' : 'Live Mainnet'}
              </span>
            </div>
            <p className="text-xs text-muted">
              {activeBalances.length > 0
                ? `Est. Portfolio: ~$${totalUsd.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} · ${activeBalances.length} assets`
                : 'No API credentials or empty wallet'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh balances from Binance"
              className="rounded-lg border border-line bg-surface-2 p-1.5 text-xs text-muted transition hover:bg-surface hover:text-ink disabled:opacity-50"
            >
              {loading ? '⏳' : '🔄'}
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs text-subtle hover:text-ink p-1"
            title={collapsed ? 'Expand card' : 'Collapse card'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          {/* Quick Spotlight: USDT & ETH */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line-soft bg-surface-2 p-3">
              <span className="text-[11px] font-medium text-muted">Free USDT</span>
              <p className="mt-0.5 text-base font-bold text-ink">
                ${(usdtAsset?.free ?? 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {usdtAsset && usdtAsset.locked > 0 && (
                <span className="text-[10px] text-subtle">
                  Locked: ${usdtAsset.locked.toFixed(2)}
                </span>
              )}
            </div>

            <div className="rounded-xl border border-line-soft bg-surface-2 p-3">
              <span className="text-[11px] font-medium text-muted">Spot ETH Holding</span>
              <p className="mt-0.5 text-base font-bold text-ink">
                {(ethAsset?.free ?? 0).toFixed(4)} ETH
              </p>
              {ethPrice && ethAsset && (
                <span className="text-[10px] text-subtle">
                  ~${(ethAsset.total * ethPrice).toFixed(2)} USD
                </span>
              )}
            </div>
          </div>

          {/* Search bar and counter */}
          {activeBalances.length > 5 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Filter assets (e.g. USDT, ETH)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setCurrentPage(1)
                    }}
                    className="absolute right-2 top-1 text-xs text-subtle hover:text-ink"
                  >
                    ×
                  </button>
                )}
              </div>
              <span className="text-[11px] text-subtle">
                Showing {filteredBalances.length} of {activeBalances.length}
              </span>
            </div>
          )}

          {/* Full Asset Breakdown Table (scrollable container, default 20 records) */}
          {filteredBalances.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line-soft">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-surface-2 text-[10px] font-semibold uppercase tracking-wider text-muted border-b border-line-soft">
                    <tr>
                      <th className="px-3 py-2">Asset</th>
                      <th className="px-3 py-2 text-right">Free</th>
                      <th className="px-3 py-2 text-right">In Orders</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {paginatedBalances.map((b) => (
                      <tr key={b.asset} className="hover:bg-surface-2/50 transition">
                        <td className="px-3 py-1.5 font-medium text-ink flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                          {b.asset}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-muted">
                          {b.free > 1000 ? b.free.toLocaleString('en-US', { maximumFractionDigits: 2 }) : b.free.toFixed(4)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-subtle">
                          {b.locked > 0 ? (b.locked > 1000 ? b.locked.toLocaleString('en-US', { maximumFractionDigits: 2 }) : b.locked.toFixed(4)) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold text-ink">
                          {b.total > 1000 ? b.total.toLocaleString('en-US', { maximumFractionDigits: 2 }) : b.total.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Standard 20 items per page pagination */}
              <div className="px-3 pb-3">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredBalances.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}

          {activeBalances.length === 0 && (
            <p className="py-2 text-center text-xs text-subtle">
              No balances detected. Configure Binance API keys in Settings to connect wallet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
