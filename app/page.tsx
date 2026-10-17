'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BacktestPanel } from '@/components/BacktestPanel'
import { CandleChart } from '@/components/CandleChart'
import { IndicatorPanel } from '@/components/IndicatorPanel'
import { SignalCard } from '@/components/SignalCard'
import { SignalHistory, type StoredSignal } from '@/components/SignalHistory'
import { ThemeToggle } from '@/components/ThemeToggle'
import { TradePlanCard } from '@/components/TradePlanCard'
import { TradingControls } from '@/components/TradingControls'
import { WalletConnect } from '@/components/WalletConnect'
import { formatAge, formatPrice } from '@/lib/format'
import { readJson } from '@/lib/utils'

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

      const signalsJson = await readJson<{ signals?: StoredSignal[] }>(signalsResponse)
      const priceJson = await readJson<PriceResponse>(priceResponse)

      setSignals(signalsJson.signals ?? [])
      setPrice(priceJson)
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
          <p className="mt-1 text-sm text-muted">
            {price ? `${price.symbol} · ${price.timeframe}` : 'ETH/USDT · 15m'} — Bollinger Bands,
            Ichimoku, RSI &amp; candlestick patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            Settings
          </Link>
          <TradingControls />
          <ThemeToggle />
          <WalletConnect />
        </div>
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
          className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          Refresh
        </button>
        {updatedAt ? (
          <span className="text-xs text-subtle">updated {formatAge(updatedAt)}</span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-down">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">Binance ETH/USDT</p>
          <p className="mt-1 text-xl font-semibold">{formatPrice(price?.price ?? null)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">Chainlink ETH/USD</p>
          <p className="mt-1 text-xl font-semibold">
            {formatPrice(price?.chainlink?.price ?? null)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-subtle">Oracle divergence</p>
          <p className="mt-1 text-xl font-semibold">
            {price?.divergencePct != null ? `${price.divergencePct}%` : '—'}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <CandleChart limit={500} />

        {loading ? (
          <p className="text-sm text-subtle">Loading…</p>
        ) : latest ? (
          <>
            <TradePlanCard plan={latest.plan} />
            <SignalCard signal={latest} />
            <IndicatorPanel indicators={latest.indicators} />
          </>
        ) : (
          <section className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-muted">
              No signals stored yet. Click <strong>Run analysis now</strong> to fetch market data
              and generate the first signal.
            </p>
          </section>
        )}

        <SignalHistory signals={signals} />
        <BacktestPanel />
      </div>

      <footer className="mt-10 border-t border-line-soft pt-5 text-xs text-subtle">
        Automated technical analysis for research only — not financial advice. Spot signals cannot
        short: a SHORT reading means exit or avoid going long. Configure{' '}
        <code className="text-muted">ALERT_EMAIL_TO</code> and{' '}
        <code className="text-muted">RESEND_API_KEY</code> for email alerts.
      </footer>
    </main>
  )
}
