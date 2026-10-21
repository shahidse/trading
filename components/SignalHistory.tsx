'use client'

import React, { useState, useMemo } from 'react'
import { DirectionBadge } from '@/components/DirectionBadge'
import { formatPrice, formatScore, formatTime } from '@/lib/format'
import type { Signal } from '@/lib/types'
import { Pagination } from '@/components/Pagination'

export type StoredSignal = Signal & { id: number; emailed: boolean }

const PAGE_SIZE = 20

export function SignalHistory({ signals }: { signals: StoredSignal[] }) {
  const [currentPage, setCurrentPage] = useState(1)

  const paginatedSignals = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return signals.slice(start, start + PAGE_SIZE)
  }, [signals, currentPage])

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
      <div className="flex items-center justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Signal History ({signals.length} total)
        </h2>
        <span className="text-[11px] text-subtle">
          Latest 15m signals & confidence readings
        </span>
      </div>

      {signals.length === 0 ? (
        <p className="mt-4 text-sm text-subtle">
          No signals stored yet. Run an analysis to create the first one.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-line-soft">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-2 border-b border-line-soft">
                <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                  <th className="py-2.5 px-4 font-semibold">Time</th>
                  <th className="py-2.5 px-4 font-semibold">Direction</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Score</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Price</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Chainlink</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Emailed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {paginatedSignals.map((signal) => (
                  <tr key={signal.id} className="text-muted hover:bg-surface-2/40 transition">
                    <td className="py-2 px-4 whitespace-nowrap text-subtle font-mono text-xs">
                      {formatTime(signal.timestamp)}
                    </td>
                    <td className="py-2 px-4">
                      <DirectionBadge direction={signal.direction} size="sm" />
                    </td>
                    <td className="py-2 px-4 text-right font-medium">{formatScore(signal.score)}</td>
                    <td className="py-2 px-4 text-right font-mono">{formatPrice(signal.price)}</td>
                    <td className="py-2 px-4 text-right text-subtle font-mono">
                      {formatPrice(signal.chainlinkPrice)}
                    </td>
                    <td className="py-2 px-4 text-right text-subtle">{signal.emailed ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={signals.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </section>
  )
}
