'use client'

import { useCallback, useEffect, useState } from 'react'
import { BacktestPanel } from '@/components/BacktestPanel'
import { IndicatorPanel } from '@/components/IndicatorPanel'
import { SignalCard } from '@/components/SignalCard'
import { SignalHistory, type StoredSignal } from '@/components/SignalHistory'
import { TradePlanCard } from '@/components/TradePlanCard'
import { WalletConnect } from '@/components/WalletConnect'
import { formatAge, formatPrice } from '@/lib/format'

type PriceResponse = {
  symbol: string
  timeframe: string
  price: number | null
  chainlink: { price: number; updatedAt: number; ageSeconds: number } | null
  divergencePct: number | null
}

const REFRESH_MS = 60_000

export default function Page() {
  const [signals, setSignals] = useState<StoredSignal[]>([])
  const [price, setPrice] = useState<PriceResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [signalsResponse, priceResponse] = await Promise.all([
        fetch('/api/signals?limit=50'),
        fetch('/api/price'),
      ])

      const signalsJson = await signalsResponse.json()
      const priceJson = await priceResponse.json()

      if (!signalsResponse.ok) throw new Error(signalsJson.error ?? 'Failed to load signals')
      if (!priceResponse.ok) throw new Error(priceJson.error ?? 'Failed to load price')

      setSignals(signalsJson.signals ?? [])
      setPrice(priceJson as PriceResponse)
      setUpdatedAt(Date.now())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  async function runAnalysis() {
    setRunning(true)
    setError(null)
    try {
      const response = await fetch('/api/analyze', { method: 'POST' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Analysis failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setRunning(false)
    }
  }

  const latest = signals[0] ?? null

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ETH Signal</h1>
          <p className="mt-1 text-sm text-slate-400">
            {price ? `${price.symbol} · ${price.timeframe}` : 'ETH/USDT · 15m'} — Bollinger Bands,
            Ichimoku, RSI &amp; candlestick patterns
          </p>
        </div>
        <WalletConnect />
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runAnalysis}
          disabled={running}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {running ? 'Analysing…' : 'Run analysis now'}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
        >
          Refresh
        </button>
        {updatedAt ? (
          <span className="text-xs text-slate-500">updated {formatAge(updatedAt)}</span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Binance ETH/USDT</p>
          <p className="mt-1 text-xl font-semibold">{formatPrice(price?.price ?? null)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Chainlink ETH/USD</p>
          <p className="mt-1 text-xl font-semibold">
            {formatPrice(price?.chainlink?.price ?? null)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Oracle divergence</p>
          <p className="mt-1 text-xl font-semibold">
            {price?.divergencePct != null ? `${price.divergencePct}%` : '—'}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : latest ? (
          <>
            <TradePlanCard plan={latest.plan} />
            <SignalCard signal={latest} />
            <IndicatorPanel indicators={latest.indicators} />
          </>
        ) : (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-sm text-slate-400">
              No signals stored yet. Click <strong>Run analysis now</strong> to fetch market data
              and generate the first signal.
            </p>
          </section>
        )}

        <SignalHistory signals={signals} />
        <BacktestPanel />
      </div>

      <footer className="mt-10 border-t border-white/5 pt-5 text-xs text-slate-500">
        Automated technical analysis for research only — not financial advice. Spot signals cannot
        short: a SHORT reading means exit or avoid going long. Configure{' '}
        <code className="text-slate-400">ALERT_EMAIL_TO</code> and{' '}
        <code className="text-slate-400">RESEND_API_KEY</code> for email alerts.
      </footer>
    </main>
  )
}
