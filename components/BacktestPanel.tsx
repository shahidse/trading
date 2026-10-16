'use client'

import { useState } from 'react'

type BacktestSummary = {
  symbol: string
  timeframe: string
  candles: number
  warmupBars: number
  exposurePct: number
  totalReturnPct: number
  buyHoldReturnPct: number
  winRate: number
  avgWinPct: number
  avgLossPct: number
  profitFactor: number
  maxDrawdownPct: number
  signalCounts: Record<'LONG' | 'SHORT' | 'NEUTRAL', number>
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : 'text-slate-100'
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  )
}

/** On-demand backtest over recent historical candles. */
export function BacktestPanel() {
  const [data, setData] = useState<BacktestSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/backtest?limit=1000')
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Backtest failed')
      setData(json as BacktestSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Backtest
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Replay the strategy on the last 1000 candles. Spot long-only, 0.1% fee per side.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run backtest'}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

      {data ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Strategy return"
              value={`${data.totalReturnPct}%`}
              tone={data.totalReturnPct >= 0 ? 'up' : 'down'}
            />
            <Stat
              label="Buy & hold"
              value={`${data.buyHoldReturnPct}%`}
              tone={data.buyHoldReturnPct >= 0 ? 'up' : 'down'}
            />
            <Stat label="Win rate" value={`${data.winRate}%`} />
            <Stat label="Profit factor" value={`${data.profitFactor}`} />
            <Stat label="Max drawdown" value={`${data.maxDrawdownPct}%`} tone="down" />
            <Stat label="Exposure" value={`${data.exposurePct}%`} />
            <Stat label="Avg win" value={`${data.avgWinPct}%`} tone="up" />
            <Stat label="Avg loss" value={`-${data.avgLossPct}%`} tone="down" />
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {data.candles} candles · warm-up {data.warmupBars} · signals — LONG{' '}
            {data.signalCounts.LONG} / SHORT {data.signalCounts.SHORT} / NEUTRAL{' '}
            {data.signalCounts.NEUTRAL}
          </p>
        </>
      ) : null}
    </section>
  )
}
