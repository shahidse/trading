'use client'

import { useState, useMemo } from 'react'
import { formatPrice, formatTime } from '@/lib/format'
import type { StoredTradeOrder } from '@/lib/db/schema'
import type { LiveOrder } from '@/lib/exchange/client'
import { Pagination } from '@/components/Pagination'
import { Spinner } from '@/components/Loader'

const PAGE_SIZE = 20

export type OrderHistoryProps = {
  orders: StoredTradeOrder[]
  openPosition?: StoredTradeOrder | null
  realisedPnl24h?: number
  onRefresh?: () => void
  loading?: boolean
  liveOrders?: {
    openOrders: LiveOrder[]
    recentOrders: LiveOrder[]
  } | null
  testnet?: boolean
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  placed: {
    label: 'Filled',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  'dry-run': {
    label: 'Simulated',
    className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  },
  refused: {
    label: 'Refused',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  skipped: {
    label: 'Skipped',
    className: 'border-line bg-surface-2 text-subtle',
  },
  error: {
    label: 'Failed',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  },
}

export function OrderHistory({
  orders,
  openPosition,
  realisedPnl24h = 0,
  onRefresh,
  loading = false,
  liveOrders,
  testnet = true,
}: OrderHistoryProps) {
  const [sourceTab, setSourceTab] = useState<'app' | 'binance'>('binance')
  const [filter, setFilter] = useState<'all' | 'executed' | 'refused'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Bot orders
  const executedOrders = orders.filter(
    (o) => o.status === 'placed' || o.status === 'dry-run',
  )
  const refusedOrders = orders.filter(
    (o) => o.status === 'refused' || o.status === 'error',
  )

  const displayedBotOrders =
    filter === 'executed'
      ? executedOrders
      : filter === 'refused'
      ? refusedOrders
      : orders

  const paginatedBotOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return displayedBotOrders.slice(start, start + PAGE_SIZE)
  }, [displayedBotOrders, currentPage])

  // Binance live orders
  const allBinanceOrders = useMemo(() => {
    if (!liveOrders) return []
    const open = liveOrders.openOrders || []
    const recent = liveOrders.recentOrders || []
    // Combine, avoiding duplicates by id
    const seen = new Set<string>()
    const combined: LiveOrder[] = []
    for (const o of [...open, ...recent]) {
      if (!seen.has(o.id)) {
        seen.add(o.id)
        combined.push(o)
      }
    }
    return combined.sort((a, b) => b.timestamp - a.timestamp)
  }, [liveOrders])

  const paginatedBinanceOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return allBinanceOrders.slice(start, start + PAGE_SIZE)
  }, [allBinanceOrders, currentPage])

  const pnlTone =
    realisedPnl24h > 0
      ? 'text-emerald-400'
      : realisedPnl24h < 0
      ? 'text-rose-400'
      : 'text-subtle'

  const openCount = liveOrders?.openOrders?.length ?? 0

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-xs">
      {/* Header with Title, Stats Badges, and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line-soft">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent text-sm">
            ⚡
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink">
                Orders & Execution Engine
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  testnet
                    ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                    : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {testnet ? 'Binance Testnet' : 'Binance Mainnet'}
              </span>
            </div>
            <p className="text-[11px] text-subtle">
              Direct Binance order book fills, open orders, and strategy audit log
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Active position chip */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-1">
            <span className="text-[10px] uppercase font-semibold text-subtle">Position:</span>
            {openPosition ? (
              <span className="font-bold text-ink">
                <span
                  className={
                    openPosition.side === 'BUY' ? 'text-emerald-400' : 'text-amber-400'
                  }
                >
                  {openPosition.side}
                </span>{' '}
                {openPosition.quantity} ETH @ {formatPrice(openPosition.price)}
              </span>
            ) : (
              <span className="text-muted font-medium">Flat (No open position)</span>
            )}
          </div>

          {/* 24h P&L chip */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-1">
            <span className="text-[10px] uppercase font-semibold text-subtle">24h P&L:</span>
            <span className={`font-mono font-bold ${pnlTone}`}>
              {realisedPnl24h > 0 ? '+' : ''}${realisedPnl24h.toFixed(4)}
            </span>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-xl border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-ink hover:bg-surface-3 transition disabled:opacity-50"
              title="Refresh order history"
            >
              {loading ? <Spinner size="xs" color="accent" /> : '↻'}
            </button>
          )}
        </div>
      </div>

      {/* Main View Mode Selector: Binance Live Orders vs Bot Internal Log */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-soft pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2 border border-line-soft">
          <button
            type="button"
            onClick={() => {
              setSourceTab('binance')
              setCurrentPage(1)
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
              sourceTab === 'binance'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <span>🟡 Binance Testnet Orders</span>
            {allBinanceOrders.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                {allBinanceOrders.length}
              </span>
            )}
            {openCount > 0 && (
              <span className="rounded-full bg-emerald-500 text-white px-1.5 py-0.2 text-[10px] font-bold animate-pulse">
                {openCount} OPEN
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceTab('app')
              setCurrentPage(1)
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
              sourceTab === 'app'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <span>🤖 Bot Execution Log</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {orders.length}
            </span>
          </button>
        </div>

        {/* Sub-filter only applicable when in App Bot mode */}
        {sourceTab === 'app' && (
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setFilter('all')
                setCurrentPage(1)
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filter === 'all'
                  ? 'bg-surface-3 text-ink font-semibold'
                  : 'text-subtle hover:text-ink'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('executed')
                setCurrentPage(1)
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filter === 'executed'
                  ? 'bg-surface-3 text-ink font-semibold'
                  : 'text-subtle hover:text-ink'
              }`}
            >
              Executed ({executedOrders.length})
            </button>
            {refusedOrders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilter('refused')
                  setCurrentPage(1)
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  filter === 'refused'
                    ? 'bg-surface-3 text-ink font-semibold'
                    : 'text-subtle hover:text-ink'
                }`}
              >
                Guarded ({refusedOrders.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 1. BINANCE TESTNET LIVE ORDERS TABLE */}
      {sourceTab === 'binance' && (
        <div className="mt-3.5 space-y-3">
          {allBinanceOrders.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-line p-8 text-center space-y-2">
              <span className="text-2xl">📋</span>
              <p className="text-sm font-semibold text-ink">No Binance Testnet Orders Placed Yet</p>
              <p className="max-w-md mx-auto text-xs text-subtle">
                Your Binance Testnet API key is active. When the bot triggers a trade or when you click
                <span className="font-semibold text-ink"> "Run Analysis"</span> on a BUY signal, your live order
                will be placed on Binance and will appear here with its real Binance Order ID.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto fancy-scrollbar rounded-xl border border-line-soft">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-surface-2 border-b border-line-soft">
                    <tr className="text-left uppercase tracking-wide text-subtle">
                      <th className="py-2.5 px-3 font-semibold">Time</th>
                      <th className="py-2.5 px-3 font-semibold">Order ID</th>
                      <th className="py-2.5 px-3 font-semibold">Side & Type</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Amount (ETH)</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Filled</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Price</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Cost (USDT)</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {paginatedBinanceOrders.map((order) => {
                      const isBuy = order.side === 'buy'
                      const isFilled = order.status.toLowerCase() === 'filled' || order.status.toLowerCase() === 'closed'
                      const isOpen = order.status.toLowerCase() === 'open' || order.status.toLowerCase() === 'new'
                      const isCanceled = order.status.toLowerCase() === 'canceled'

                      return (
                        <tr key={order.id} className="text-muted transition hover:bg-surface-2/40">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-subtle">
                            {formatTime(order.timestamp)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-subtle">
                            #{order.id.slice(-6)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold uppercase ${
                                isBuy ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isBuy ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                              />
                              {order.side} {order.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-ink">
                            {order.amount.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted">
                            {order.filled.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-ink">
                            {order.price > 0 ? `$${order.price.toFixed(2)}` : 'Market'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                            ${order.cost.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                isFilled
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  : isOpen
                                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                                  : isCanceled
                                  ? 'border-line bg-surface-2 text-subtle'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalItems={allBinanceOrders.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      )}

      {/* 2. BOT AUDIT EXECUTION LOG TABLE */}
      {sourceTab === 'app' && (
        <div className="mt-3.5 space-y-3">
          {displayedBotOrders.length === 0 ? (
            loading ? (
              <div className="mt-6 rounded-xl border border-line bg-surface-2/60 p-6 text-center flex flex-col items-center justify-center gap-2">
                <Spinner size="sm" color="accent" />
                <p className="text-xs font-semibold text-ink">Synchronizing trade orders & execution logs…</p>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-line p-6 text-center">
                <p className="text-sm font-medium text-ink">No orders matching this filter</p>
                <p className="mt-1 text-xs text-subtle">
                  When automatic trading or Reversal Scalping triggers, orders will be recorded here automatically.
                </p>
              </div>
            )
          ) : (
            <>
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto fancy-scrollbar rounded-xl border border-line-soft">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-surface-2 border-b border-line-soft">
                    <tr className="text-left uppercase tracking-wide text-subtle">
                      <th className="py-2 px-3 font-semibold">Time</th>
                      <th className="py-2 px-3 font-semibold">Side & Type</th>
                      <th className="py-2 px-3 text-right font-semibold">Qty (ETH)</th>
                      <th className="py-2 px-3 text-right font-semibold">Price</th>
                      <th className="py-2 px-3 text-right font-semibold">Notional</th>
                      <th className="py-2 px-3 text-right font-semibold">Realised P&L</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                      <th className="py-2 px-3 font-semibold">Trigger / Guard Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {paginatedBotOrders.map((order) => {
                      const badge = STATUS_BADGE[order.status] ?? {
                        label: order.status,
                        className: 'border-line text-muted',
                      }
                      const isBuy = order.side === 'BUY'
                      const pnl = order.realisedPnlUsd

                      return (
                        <tr key={order.id} className="text-muted transition hover:bg-surface-2/40">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-subtle">
                            {formatTime(order.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                isBuy ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isBuy ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                              />
                              {order.side} {order.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-ink">
                            {order.quantity > 0 ? order.quantity.toFixed(4) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-ink">
                            {order.price ? formatPrice(order.price) : 'market'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-subtle">
                            ${order.notionalUsd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {pnl !== null && pnl !== undefined ? (
                              <span
                                className={`font-semibold ${
                                  pnl > 0
                                    ? 'text-emerald-400'
                                    : pnl < 0
                                    ? 'text-rose-400'
                                    : 'text-subtle'
                                }`}
                              >
                                {pnl > 0 ? '+' : ''}${pnl.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-subtle">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-subtle max-w-xs truncate" title={order.reason ?? undefined}>
                            {order.reason || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalItems={displayedBotOrders.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      )}
    </section>
  )
}
