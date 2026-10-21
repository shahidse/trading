'use client'

import React from 'react'

export type PaginationProps = {
  currentPage: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems <= pageSize) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(totalItems, currentPage * pageSize)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-line-soft text-xs text-muted">
      <div className="text-[11px] text-subtle">
        Showing <span className="font-semibold text-ink">{startItem}</span>–
        <span className="font-semibold text-ink">{endItem}</span> of{' '}
        <span className="font-semibold text-ink">{totalItems}</span> records
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 font-medium transition hover:bg-surface hover:text-ink disabled:opacity-40 disabled:pointer-events-none text-xs"
        >
          Previous
        </button>
        <span className="px-2 font-mono text-[11px] text-subtle">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 font-medium transition hover:bg-surface hover:text-ink disabled:opacity-40 disabled:pointer-events-none text-xs"
        >
          Next
        </button>
      </div>
    </div>
  )
}
