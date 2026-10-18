'use client'

import { useState } from 'react'
import { formatPrice, formatTime } from '@/lib/format'
import type { StoredTradeOrder } from '@/lib/db/client'

export type OrderHistoryProps = {
  orders: StoredTradeOrder[]
  openPosition?: StoredTradeOrder | null
  realisedPnl24h?: number
  onRefresh?: () => void
  loading?: boolean
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
}: OrderHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'executed' | 'refused'>('all')

  const executedOrders = orders.filter(
    (o) => o.status === 'placed' || o.status === 'dry-run'
  )
  const refusedOrders = orders.filter(
    (o) => o.status === 'refused' || o.status === 'error'
  )

  const displayedOrders =
    filter === 'executed'
      ? executedOrders
      : filter === 'refused'
      ? refusedOrders
      : orders

  const pnlTone =
    realisedPnl24h > 0
      ? 'text-emerald-400'
      : realisedPnl24h < 0
      ? 'text-rose-400'
      : 'text-subtle'

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-xs">
      {/* Header with Title, Stats Badges, and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line-soft">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent text-sm">
            ⚡
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink flex items-center gap-2">
              Order & Execution History
              <span className="text-xs font-normal normal-case text-subtle">
                ({orders.length} total)
              </span>
            </h2>
            <p className="text-[11px] text-subtle">
              Live spot orders and dry-run paper executions with realised P&L
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
              {loading ? '…' : '↻'}
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-accent text-white shadow-xs'
                : 'text-subtle hover:text-ink hover:bg-surface-2'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('executed')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              filter === 'executed'
                ? 'bg-accent text-white shadow-xs'
                : 'text-subtle hover:text-ink hover:bg-surface-2'
            }`}
          >
            Executed / Simulated ({executedOrders.length})
          </button>
          {refusedOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('refused')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filter === 'refused'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-subtle hover:text-ink hover:bg-surface-2'
              }`}
            >
              Refused / Guarded ({refusedOrders.length})
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      {displayedOrders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line p-6 text-center">
          <p className="text-sm font-medium text-ink">No orders matching this filter</p>
          <p className="mt-1 text-xs text-subtle">
            When automatic trading or Reversal Scalping mode triggers, your live or dry-run orders
            will be recorded here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line-soft text-left uppercase tracking-wide text-subtle">
                <th className="py-2 pr-3 font-semibold">Time</th>
                <th className="py-2 pr-3 font-semibold">Side & Type</th>
                <th className="py-2 pr-3 text-right font-semibold">Qty (ETH)</th>
                <th className="py-2 pr-3 text-right font-semibold">Price</th>
                <th className="py-2 pr-3 text-right font-semibold">Notional</th>
                <th className="py-2 pr-3 text-right font-semibold">Realised P&L</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 font-semibold">Trigger / Guard Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {displayedOrders.map((order) => {
                const badge = STATUS_BADGE[order.status] ?? {
                  label: order.status,
                  className: 'border-line text-muted',
                }
                const isBuy = order.side === 'BUY'
                const pnl = order.realisedPnlUsd

                return (
                  <tr key={order.id} className="text-muted transition hover:bg-surface-2/40">
                    <td className="py-2.5 pr-3 whitespace-nowrap font-mono text-subtle">
                      {formatTime(order.createdAt)}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider text-[11px] ${
                            isBuy
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {order.side}
                        </span>
                        {order.type === 'oco' ? (
                          <span className="rounded bg-indigo-500/15 px-1 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/30">
                            OCO
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-medium text-ink">
                      {order.quantity ? order.quantity.toFixed(4) : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-ink">
                      {formatPrice(order.price)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-subtle">
                      {order.notionalUsd ? `$${order.notionalUsd.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      {pnl != null ? (
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
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-subtle max-w-xs truncate" title={order.reason ?? undefined}>
                      {order.reason || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
