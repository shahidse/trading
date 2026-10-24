'use client'

import { useState, useEffect } from 'react'
import type { FullConfigReport } from '@/lib/exchange/config-report'
import Link from 'next/link'
import { SettingsButton } from '@/components/SettingsButton'

export function ConfigReportButton({
  targetSymbol = 'ETH/USDT',
  className = '',
}: {
  targetSymbol?: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [report, setReport] = useState<FullConfigReport | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchReport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/config-report?symbol=${encodeURIComponent(targetSymbol)}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      }
    } catch (err) {
      console.warn('Failed to fetch config report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchReport()
    const timer = setInterval(() => void fetchReport(), 20000)
    return () => clearInterval(timer)
  }, [targetSymbol])

  const overallStatus = report?.verdict.overallStatus ?? 'READY'
  const blockersCount = report?.verdict.activeBlockers.length ?? 0

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          void fetchReport()
        }}
        title="View execution limits, guard readiness report, and trading volume breakdown"
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
          overallStatus === 'BLOCKED'
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
            : overallStatus === 'PARTIALLY_BLOCKED'
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
        } ${className}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            overallStatus === 'BLOCKED'
              ? 'bg-rose-400 animate-pulse'
              : overallStatus === 'PARTIALLY_BLOCKED'
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }`}
        />
        <span className="hidden sm:inline">Config & Guards:</span>
        <span>
          {overallStatus === 'BLOCKED'
            ? `Blocked (${blockersCount})`
            : overallStatus === 'PARTIALLY_BLOCKED'
            ? 'Partial'
            : 'Ready'}
        </span>
      </button>

      {isOpen && (
        <ConfigReportModal
          report={report}
          loading={loading}
          onClose={() => setIsOpen(false)}
          onRefresh={fetchReport}
        />
      )}
    </>
  )
}

export function ConfigReportModal({
  report,
  loading,
  onClose,
  onRefresh,
}: {
  report: FullConfigReport | null
  loading: boolean
  onClose: () => void
  onRefresh: () => void
}) {
  const [activeTab, setActiveTab] = useState<'readiness' | 'breakdown' | 'guards' | 'refusals'>('readiness')

  if (!report) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center text-ink shadow-2xl">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm font-semibold">Loading Config Diagnostic Report…</p>
        </div>
      </div>
    )
  }

  const { verdict, primaryReadiness, hotCoinsReadiness, limits, tradingBreakdown, recentRefusals } = report

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-4xl rounded-2xl border border-line bg-surface text-ink shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-surface-2/60">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-base font-bold shadow-xs ${
                verdict.overallStatus === 'BLOCKED'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : verdict.overallStatus === 'PARTIALLY_BLOCKED'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {verdict.overallStatus === 'BLOCKED' ? '🛑' : verdict.overallStatus === 'PARTIALLY_BLOCKED' ? '⚠️' : '✅'}
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Execution & Limit Readiness Report</h2>
              <p className="text-xs text-muted">Real-time safety guard diagnostic and trading volume breakdown</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh diagnostic report"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-ink hover:bg-surface transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-muted border-t-transparent" />
                  <span>Refreshing…</span>
                </>
              ) : (
                '↻ Refresh'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-ink hover:bg-surface transition"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line bg-surface px-4 py-2 gap-2 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'readiness', label: '⚡ Readiness & Limits', badge: verdict.activeBlockers.length ? `${verdict.activeBlockers.length} Blocked` : 'All OK' },
            { id: 'breakdown', label: '📊 Hot Coins vs Others Traded', badge: `$${tradingBreakdown.summary.totalVolumeUsd.toFixed(0)} Vol` },
            { id: 'guards', label: '🛡️ Safety Guard Audit', badge: `${primaryReadiness.guards.length + hotCoinsReadiness.guards.length} Checked` },
            { id: 'refusals', label: '📋 Guard Refusals Log', badge: `${recentRefusals.length}` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-subtle hover:text-ink hover:bg-surface-2'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === tab.id
                    ? 'bg-black/30 text-white'
                    : 'bg-surface-2 text-muted border border-line'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: READINESS & LIMIT METERS */}
          {activeTab === 'readiness' && (
            <div className="space-y-5">
              {/* Overall Status Banner */}
              <div
                className={`rounded-xl border p-4 ${
                  verdict.overallStatus === 'BLOCKED'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    : verdict.overallStatus === 'PARTIALLY_BLOCKED'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {verdict.overallStatus === 'BLOCKED'
                      ? '🛑'
                      : verdict.overallStatus === 'PARTIALLY_BLOCKED'
                      ? '⚠️'
                      : '✅'}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-ink mb-1">{verdict.headline}</h3>
                    {verdict.activeBlockers.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs font-semibold text-rose-400 uppercase tracking-wide">
                          Constraints stopping order execution:
                        </p>
                        <ul className="space-y-1 text-xs">
                          {verdict.activeBlockers.map((b, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-rose-200">
                              <span className="text-rose-400">✖</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-400/90">
                        All financial safety guards, rate limits, and risk ceilings are clear. Orders are allowed to execute based on strategy conditions.
                      </p>
                    )}

                    {verdict.activeWarnings.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-line/40 space-y-1 text-xs text-amber-300">
                        <span className="font-semibold uppercase tracking-wide text-[10px] text-amber-400">
                          Active Warnings:
                        </span>
                        {verdict.activeWarnings.map((w, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span>⚠</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <SettingsButton
                    className="shrink-0 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface transition"
                    loadingLabel="Opening Settings…"
                  >
                    ⚙ Configure Settings
                  </SettingsButton>
                </div>
              </div>

              {/* Limit Gauges & Progress Meters */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                  Risk Ceilings & 24h Rolling Limit Meters
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Primary Daily Loss Limit */}
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">Primary 24h Loss Limit</span>
                      <span
                        className={`font-mono font-bold ${
                          limits.primaryDailyLoss.status === 'breached'
                            ? 'text-rose-400'
                            : limits.primaryDailyLoss.status === 'warning'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        ${limits.primaryDailyLoss.current.toFixed(2)} / ${limits.primaryDailyLoss.limit.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden border border-line/50">
                      <div
                        className={`h-full transition-all duration-500 ${
                          limits.primaryDailyLoss.status === 'breached'
                            ? 'bg-rose-500'
                            : limits.primaryDailyLoss.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, limits.primaryDailyLoss.percentUsed)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>{limits.primaryDailyLoss.percentUsed}% utilized</span>
                      <span>
                        {limits.primaryDailyLoss.status === 'breached'
                          ? 'Limit breached (Trading paused)'
                          : `$${limits.primaryDailyLoss.remaining.toFixed(2)} headroom remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Primary Daily Trades Limit */}
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">Primary 24h Trade Count</span>
                      <span
                        className={`font-mono font-bold ${
                          limits.primaryDailyTrades.status === 'breached'
                            ? 'text-rose-400'
                            : limits.primaryDailyTrades.status === 'warning'
                            ? 'text-amber-400'
                            : 'text-indigo-400'
                        }`}
                      >
                        {limits.primaryDailyTrades.current} / {limits.primaryDailyTrades.limit} trades
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden border border-line/50">
                      <div
                        className={`h-full transition-all duration-500 ${
                          limits.primaryDailyTrades.status === 'breached'
                            ? 'bg-rose-500'
                            : limits.primaryDailyTrades.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-indigo-400'
                        }`}
                        style={{ width: `${Math.min(100, limits.primaryDailyTrades.percentUsed)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>{limits.primaryDailyTrades.percentUsed}% utilized</span>
                      <span>
                        {limits.primaryDailyTrades.status === 'breached'
                          ? 'Trade cap reached'
                          : `${limits.primaryDailyTrades.remaining} trades remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Hot Coins Daily Loss Limit */}
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">Hot Coins 24h Loss Ceiling</span>
                      <span
                        className={`font-mono font-bold ${
                          limits.hotCoinsDailyLoss.status === 'breached'
                            ? 'text-rose-400'
                            : limits.hotCoinsDailyLoss.status === 'warning'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        ${limits.hotCoinsDailyLoss.current.toFixed(2)} / ${limits.hotCoinsDailyLoss.limit.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden border border-line/50">
                      <div
                        className={`h-full transition-all duration-500 ${
                          limits.hotCoinsDailyLoss.status === 'breached'
                            ? 'bg-rose-500'
                            : limits.hotCoinsDailyLoss.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, limits.hotCoinsDailyLoss.percentUsed)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>{limits.hotCoinsDailyLoss.percentUsed}% utilized</span>
                      <span>
                        {limits.hotCoinsDailyLoss.status === 'breached'
                          ? 'Loss cap reached'
                          : `$${limits.hotCoinsDailyLoss.remaining.toFixed(2)} remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Hot Coins Daily Trades Limit */}
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">Hot Coins 24h Trade Count</span>
                      <span
                        className={`font-mono font-bold ${
                          limits.hotCoinsDailyTrades.status === 'breached'
                            ? 'text-rose-400'
                            : limits.hotCoinsDailyTrades.status === 'warning'
                            ? 'text-amber-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {limits.hotCoinsDailyTrades.current} / {limits.hotCoinsDailyTrades.limit} trades
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden border border-line/50">
                      <div
                        className={`h-full transition-all duration-500 ${
                          limits.hotCoinsDailyTrades.status === 'breached'
                            ? 'bg-rose-500'
                            : limits.hotCoinsDailyTrades.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, limits.hotCoinsDailyTrades.percentUsed)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>{limits.hotCoinsDailyTrades.percentUsed}% utilized</span>
                      <span>
                        {limits.hotCoinsDailyTrades.status === 'breached'
                          ? 'Ceiling reached'
                          : `${limits.hotCoinsDailyTrades.remaining} trades remaining`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy Cards Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="rounded-xl border border-line p-3.5 bg-surface-2/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">{primaryReadiness.strategyName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        primaryReadiness.status === 'READY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {primaryReadiness.status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-muted">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-semibold text-ink">{primaryReadiness.enabled ? 'Armed' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Environment:</span>
                      <span className="font-semibold text-ink uppercase">{primaryReadiness.environment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hard Cap / Order:</span>
                      <span className="font-mono text-ink">${limits.maxNotionalUsd}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-line p-3.5 bg-surface-2/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">{hotCoinsReadiness.strategyName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        hotCoinsReadiness.status === 'READY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {hotCoinsReadiness.status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-muted">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-semibold text-ink">{hotCoinsReadiness.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Environment:</span>
                      <span className="font-semibold text-ink uppercase">{hotCoinsReadiness.environment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hard Cap / Order:</span>
                      <span className="font-mono text-ink">${limits.hotCoinsMaxNotionalUsd}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRADING BREAKDOWN (HOT COINS VS OTHER COINS) */}
          {activeTab === 'breakdown' && (
            <div className="space-y-5">
              {/* Grand Total Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-center">
                  <div className="text-[11px] text-muted">Total Volume Traded</div>
                  <div className="text-lg font-mono font-bold text-ink">
                    ${tradingBreakdown.summary.totalVolumeUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-subtle mt-0.5">
                    {tradingBreakdown.summary.executedBuys + tradingBreakdown.summary.executedSells} executed orders
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-center">
                  <div className="text-[11px] text-muted">Total Realised PnL</div>
                  <div
                    className={`text-lg font-mono font-bold ${
                      tradingBreakdown.summary.totalRealisedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tradingBreakdown.summary.totalRealisedPnlUsd >= 0 ? '+' : ''}$
                    {tradingBreakdown.summary.totalRealisedPnlUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-subtle mt-0.5">
                    Win Rate: {tradingBreakdown.summary.overallWinRatePct}%
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-center">
                  <div className="text-[11px] text-muted">Hot Coins Volume</div>
                  <div className="text-lg font-mono font-bold text-amber-400">
                    ${tradingBreakdown.hotCoins.volumeUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-subtle mt-0.5">
                    {tradingBreakdown.hotCoins.coins.length} altcoins traded
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface-2/40 p-3 text-center">
                  <div className="text-[11px] text-muted">Primary (ETH) Volume</div>
                  <div className="text-lg font-mono font-bold text-indigo-400">
                    ${tradingBreakdown.primary.volumeUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-subtle mt-0.5">
                    {tradingBreakdown.primary.executedBuys + tradingBreakdown.primary.executedSells} executed
                  </div>
                </div>
              </div>

              {/* Side-by-Side Category Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Coin Trading (ETH/USDT) */}
                <div className="rounded-xl border border-line bg-surface-2/20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{tradingBreakdown.primary.symbol}</span>
                      <span className="rounded-md bg-indigo-500/20 text-indigo-400 px-2 py-0.5 text-[10px] font-semibold">
                        Primary Pair
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-ink">
                      ${tradingBreakdown.primary.volumeUsd.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-surface p-2 border border-line/40">
                      <div className="text-[10px] text-muted">Executed Buys</div>
                      <div className="font-mono font-bold text-ink">{tradingBreakdown.primary.executedBuys}</div>
                    </div>
                    <div className="rounded-lg bg-surface p-2 border border-line/40">
                      <div className="text-[10px] text-muted">Executed Sells</div>
                      <div className="font-mono font-bold text-ink">{tradingBreakdown.primary.executedSells}</div>
                    </div>
                    <div className="rounded-lg bg-surface p-2 border border-line/40">
                      <div className="text-[10px] text-muted">Win Rate</div>
                      <div className="font-mono font-bold text-ink">{tradingBreakdown.primary.winRatePct}%</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted">Realised PnL:</span>
                    <span
                      className={`font-mono font-bold ${
                        tradingBreakdown.primary.realisedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tradingBreakdown.primary.realisedPnlUsd >= 0 ? '+' : ''}$
                      {tradingBreakdown.primary.realisedPnlUsd.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-line/40">
                    <span className="text-muted">Active Position:</span>
                    <span className="font-semibold text-ink">
                      {tradingBreakdown.primary.openPosition ? (
                        <span className="text-emerald-400">
                          {tradingBreakdown.primary.openPosition.side} (${tradingBreakdown.primary.openPosition.notionalUsd.toFixed(2)})
                        </span>
                      ) : (
                        'Flat (No open position)'
                      )}
                    </span>
                  </div>
                </div>

                {/* Hot Coins Trading (Top Altcoins) */}
                <div className="rounded-xl border border-line bg-surface-2/20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">Top Hot Coins</span>
                      <span className="rounded-md bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
                        Breakout Scanner
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-ink">
                      ${tradingBreakdown.hotCoins.volumeUsd.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-surface p-2 border border-line/40">
                      <div className="text-[10px] text-muted">Executed Buys</div>
                      <div className="font-mono font-bold text-ink">{tradingBreakdown.hotCoins.executedBuys}</div>
                    </div>
                    <div className="rounded-lg bg-surface p-2 border border-line/40">
                      <div className="text-[10px] text-muted">Executed Sells</div>
                      <div className="font-mono font-bold text-ink">{tradingBreakdown.hotCoins.executedSells}</div>
                    </div>
                    <div className="rounded-lg bg-surface p-2 border border-line/40">
                      <div className="text-[10px] text-muted">Win Rate</div>
                      <div className="font-mono font-bold text-ink">{tradingBreakdown.hotCoins.winRatePct}%</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted">Realised PnL:</span>
                    <span
                      className={`font-mono font-bold ${
                        tradingBreakdown.hotCoins.realisedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tradingBreakdown.hotCoins.realisedPnlUsd >= 0 ? '+' : ''}$
                      {tradingBreakdown.hotCoins.realisedPnlUsd.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-line/40">
                    <span className="text-muted">Active Positions:</span>
                    <span className="font-semibold text-ink">
                      {tradingBreakdown.hotCoins.activePositionsCount > 0 ? (
                        <span className="text-amber-400">
                          {tradingBreakdown.hotCoins.activePositionsCount} hot coins held
                        </span>
                      ) : (
                        '0 held (Flat)'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hot Coins Individual Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                  Hot Coins Individual Breakdown ({tradingBreakdown.hotCoins.coins.length} Coins Traded)
                </h4>
                {tradingBreakdown.hotCoins.coins.length === 0 ? (
                  <div className="rounded-xl border border-line p-6 text-center text-muted text-xs">
                    No hot coin trades recorded yet. You can trigger auto-buys or test entries via the Hot Coins Radar.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-line">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-line bg-surface-2/60 text-muted">
                        <tr>
                          <th className="p-3">Symbol</th>
                          <th className="p-3">Volume Traded</th>
                          <th className="p-3">Orders (B/S)</th>
                          <th className="p-3">Realised PnL</th>
                          <th className="p-3">Win Rate</th>
                          <th className="p-3">Position Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/40 bg-surface">
                        {tradingBreakdown.hotCoins.coins.map((coin) => (
                          <tr key={coin.symbol} className="hover:bg-surface-2/30 transition">
                            <td className="p-3 font-bold text-ink">{coin.symbol}</td>
                            <td className="p-3 font-mono font-semibold">${coin.volumeUsd.toFixed(2)}</td>
                            <td className="p-3 font-mono">
                              <span className="text-emerald-400">{coin.buysCount}B</span> /{' '}
                              <span className="text-rose-400">{coin.sellsCount}S</span>
                            </td>
                            <td
                              className={`p-3 font-mono font-bold ${
                                coin.realisedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {coin.realisedPnlUsd >= 0 ? '+' : ''}${coin.realisedPnlUsd.toFixed(2)}
                            </td>
                            <td className="p-3 font-mono">{coin.winRatePct}%</td>
                            <td className="p-3">
                              {coin.hasOpenPosition ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Holding
                                </span>
                              ) : (
                                <span className="text-muted text-[11px]">Flat</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SAFETY GUARDS AUDIT */}
          {activeTab === 'guards' && (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Every trade is checked against these pure safety conditions prior to order placement. If any guard fails, the order is safely refused.
              </p>

              <div>
                <h4 className="text-xs font-bold text-ink mb-2">Primary Strategy Safety Guards ({primaryReadiness.strategyName})</h4>
                <div className="space-y-2">
                  {primaryReadiness.guards.map((guard) => (
                    <div
                      key={guard.id}
                      className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                        guard.status === 'blocked'
                          ? 'border-rose-500/40 bg-rose-500/10'
                          : guard.status === 'warning'
                          ? 'border-amber-500/40 bg-amber-500/10'
                          : 'border-line bg-surface-2/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{guard.name}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              guard.status === 'blocked'
                                ? 'bg-rose-500/20 text-rose-400'
                                : guard.status === 'warning'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {guard.status}
                          </span>
                        </div>
                        <p className="text-muted text-[11px]">{guard.message}</p>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-ink font-bold">{guard.currentValue}</div>
                        <div className="text-[10px] text-muted">{guard.thresholdOrLimit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <h4 className="text-xs font-bold text-ink mb-2">Hot Coins Safety Guards ({hotCoinsReadiness.strategyName})</h4>
                <div className="space-y-2">
                  {hotCoinsReadiness.guards.map((guard) => (
                    <div
                      key={guard.id}
                      className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                        guard.status === 'blocked'
                          ? 'border-rose-500/40 bg-rose-500/10'
                          : guard.status === 'warning'
                          ? 'border-amber-500/40 bg-amber-500/10'
                          : 'border-line bg-surface-2/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{guard.name}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              guard.status === 'blocked'
                                ? 'bg-rose-500/20 text-rose-400'
                                : guard.status === 'warning'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {guard.status}
                          </span>
                        </div>
                        <p className="text-muted text-[11px]">{guard.message}</p>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-ink font-bold">{guard.currentValue}</div>
                        <div className="text-[10px] text-muted">{guard.thresholdOrLimit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RECENT GUARD REFUSALS LOG */}
          {activeTab === 'refusals' && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Audit log of order attempts that were refused or skipped by the safety guards.
              </p>
              {recentRefusals.length === 0 ? (
                <div className="rounded-xl border border-line p-8 text-center text-muted text-xs">
                  ✅ No recent guard refusals. All attempted orders passed pre-flight checks.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentRefusals.map((refusal) => (
                    <div
                      key={refusal.id}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{refusal.symbol}</span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              refusal.side === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {refusal.side}
                          </span>
                          <span className="font-mono text-muted text-[11px]">${refusal.notionalUsd.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] text-muted font-mono">
                          {new Date(refusal.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-rose-300 font-medium">{refusal.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
