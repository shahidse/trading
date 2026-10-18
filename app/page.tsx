'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BacktestPanel } from '@/components/BacktestPanel'
import { CandleChart } from '@/components/CandleChart'
import { IndicatorPanel } from '@/components/IndicatorPanel'
import { SignalCard } from '@/components/SignalCard'
import { SignalHistory, type StoredSignal } from '@/components/SignalHistory'
import { ThemeToggle, useTheme } from '@/components/ThemeToggle'
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
  const { themeStyle, colorMode } = useTheme()
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

  // Archetype-specific container and layout classes
  const isDataDriven = themeStyle === 'data-driven'
  const isNeofuturistic = themeStyle === 'neofuturistic'
  const isPlayful = themeStyle === 'playful'
  const isBrutalist = themeStyle === 'brutalist'

  const containerClass = isDataDriven
    ? 'mx-auto max-w-7xl px-4 py-6 font-mono text-xs' // High density trading terminal
    : isNeofuturistic
    ? 'mx-auto max-w-6xl px-6 py-10 font-sans tracking-wide' // Glass synth cockpit
    : isPlayful
    ? 'mx-auto max-w-4xl px-5 py-8 font-sans' // Focused social-fi feed
    : 'mx-auto max-w-6xl px-4 py-8 font-mono border-x-4 border-line' // High contrast brutalist editorial

  return (
    <main className={containerClass}>
      {/* Archetype Header Branding */}
      <header
        className={`flex flex-wrap items-center justify-between gap-4 pb-6 ${
          isBrutalist
            ? 'border-b-4 border-line'
            : isPlayful
            ? 'rounded-3xl border-2 border-line bg-surface p-5 shadow-sm'
            : isNeofuturistic
            ? 'rounded-2xl border border-line bg-surface/70 backdrop-blur-md p-5 shadow-lg'
            : 'border-b border-line'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`font-extrabold tracking-tight ${
                isBrutalist
                  ? 'text-3xl uppercase tracking-tighter'
                  : isPlayful
                  ? 'text-3xl font-black text-accent'
                  : isNeofuturistic
                  ? 'text-2xl uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-accent to-up'
                  : 'text-xl font-bold tracking-tight'
              }`}
            >
              ETH SIGNAL {isBrutalist ? '■' : isPlayful ? '🚀' : isNeofuturistic ? '◈' : ''}
            </h1>
            <span
              className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                isBrutalist
                  ? 'border-2 border-line bg-accent text-white'
                  : isPlayful
                  ? 'rounded-full bg-accent-soft text-accent font-bold'
                  : 'rounded-md border border-line bg-surface-2 text-subtle'
              }`}
            >
              {themeStyle}
            </span>
          </div>

          <p className="mt-1 text-xs text-muted">
            {price ? `${price.symbol} · ${price.timeframe}` : 'ETH/USDT · 15m'} — Systematic Spot
            Confluence Engine
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TradingControls />
          <Link
            href="/settings"
            className={`px-3 py-1.5 text-xs font-semibold transition ${
              isBrutalist
                ? 'border-2 border-line bg-surface text-ink hover:bg-accent hover:text-white'
                : isPlayful
                ? 'rounded-full border border-line bg-surface hover:bg-surface-2'
                : 'rounded-lg border border-line hover:bg-surface-2 text-muted hover:text-ink'
            }`}
          >
            ⚙ Settings
          </Link>
          <WalletConnect />
        </div>
      </header>

      {/* Top Controls Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={running}
            className={`px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
              isBrutalist
                ? 'border-3 border-line bg-accent text-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[3px_3px_0px_var(--line)]'
                : isPlayful
                ? 'rounded-full bg-accent text-white px-6 py-2.5 font-black hover:scale-105 shadow-md shadow-accent/25'
                : isNeofuturistic
                ? 'rounded-xl bg-gradient-to-r from-accent to-up text-white shadow-lg shadow-accent/20 hover:brightness-110'
                : 'rounded-lg bg-indigo-500 text-white hover:bg-indigo-400'
            }`}
          >
            {running ? 'Evaluating 9 Indicators…' : '▶ Run Analysis Now'}
          </button>

          <button
            type="button"
            onClick={() => void load()}
            className={`px-4 py-2 text-xs font-medium text-muted transition hover:text-ink ${
              isBrutalist
                ? 'border-2 border-line bg-surface'
                : isPlayful
                ? 'rounded-full border border-line bg-surface hover:bg-surface-2'
                : 'rounded-lg border border-line hover:bg-surface-2'
            }`}
          >
            ↻ Refresh
          </button>
        </div>

        {updatedAt ? (
          <span className="text-xs text-subtle">Synced {formatAge(updatedAt)}</span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-down">
          {error}
        </p>
      ) : null}

      {/* Market Price Strip */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div
          className={`p-4 transition ${
            isBrutalist
              ? 'border-3 border-line bg-surface shadow-[4px_4px_0px_var(--line)]'
              : isPlayful
              ? 'rounded-3xl border-2 border-line bg-surface shadow-xs'
              : isNeofuturistic
              ? 'rounded-2xl border border-line bg-surface/80 backdrop-blur-sm'
              : 'rounded-xl border border-line bg-surface'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">
            Binance ETH/USDT
          </p>
          <p className="mt-1 text-2xl font-black">{formatPrice(price?.price ?? null)}</p>
        </div>

        <div
          className={`p-4 transition ${
            isBrutalist
              ? 'border-3 border-line bg-surface shadow-[4px_4px_0px_var(--line)]'
              : isPlayful
              ? 'rounded-3xl border-2 border-line bg-surface shadow-xs'
              : isNeofuturistic
              ? 'rounded-2xl border border-line bg-surface/80 backdrop-blur-sm'
              : 'rounded-xl border border-line bg-surface'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">
            Chainlink ETH/USD
          </p>
          <p className="mt-1 text-2xl font-black">
            {formatPrice(price?.chainlink?.price ?? null)}
          </p>
        </div>

        <div
          className={`p-4 transition ${
            isBrutalist
              ? 'border-3 border-line bg-surface shadow-[4px_4px_0px_var(--line)]'
              : isPlayful
              ? 'rounded-3xl border-2 border-line bg-surface shadow-xs'
              : isNeofuturistic
              ? 'rounded-2xl border border-line bg-surface/80 backdrop-blur-sm'
              : 'rounded-xl border border-line bg-surface'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">
            Oracle Divergence
          </p>
          <p className="mt-1 text-2xl font-black">
            {price?.divergencePct != null ? `${price.divergencePct}%` : '—'}
          </p>
        </div>
      </div>

      {/* =========================================================================
          DYNAMIC ARCHETYPE LAYOUT MATRICES
         ========================================================================= */}

      {/* 1. DATA-DRIVEN TERMINAL: High-density 2-Column Cockpit Layout */}
      {isDataDriven && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Chart Column (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-xl border border-line bg-surface p-2 shadow-xs">
              <CandleChart limit={500} />
            </div>
            <BacktestPanel />
          </div>

          {/* Quant Signals & Indicators Sidebar (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            {loading ? (
              <p className="text-sm text-subtle">Loading signals…</p>
            ) : latest ? (
              <>
                <TradePlanCard plan={latest.plan} />
                <SignalCard signal={latest} />
                <IndicatorPanel indicators={latest.indicators} />
              </>
            ) : null}
            <SignalHistory signals={signals} />
          </div>
        </div>
      )}

      {/* 2. NEOFUTURISTIC AI: Glass Synth Grid Layout with Chart on Top */}
      {isNeofuturistic && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-line bg-surface/70 p-3 shadow-xl backdrop-blur-md">
            <CandleChart limit={500} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {latest && <TradePlanCard plan={latest.plan} />}
            {latest && <SignalCard signal={latest} />}
          </div>

          {latest && <IndicatorPanel indicators={latest.indicators} />}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SignalHistory signals={signals} />
            <BacktestPanel />
          </div>
        </div>
      )}

      {/* 3. PLAYFUL CONSUMER-GRADE: Feed Flow with Signal & Plan Front and Center */}
      {isPlayful && (
        <div className="mt-6 space-y-6">
          {/* Front and center actionable card */}
          {latest && (
            <div className="rounded-3xl border-2 border-line bg-surface p-2 shadow-md">
              <TradePlanCard plan={latest.plan} />
            </div>
          )}

          <div className="rounded-3xl border-2 border-line bg-surface p-3 shadow-md">
            <CandleChart limit={500} />
          </div>

          {latest && <SignalCard signal={latest} />}
          {latest && <IndicatorPanel indicators={latest.indicators} />}
          <SignalHistory signals={signals} />
          <BacktestPanel />
        </div>
      )}

      {/* 4. NEO-BRUTALIST EDITORIAL: Stark Asymmetric Grid with Heavy Borders */}
      {isBrutalist && (
        <div className="mt-6 space-y-6">
          <div className="border-3 border-line bg-surface p-2 shadow-[6px_6px_0px_var(--line)]">
            <CandleChart limit={500} />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {latest && (
              <div className="border-3 border-line bg-surface p-1 shadow-[4px_4px_0px_var(--line)]">
                <TradePlanCard plan={latest.plan} />
              </div>
            )}
            {latest && (
              <div className="border-3 border-line bg-surface p-1 shadow-[4px_4px_0px_var(--line)]">
                <SignalCard signal={latest} />
              </div>
            )}
          </div>

          {latest && (
            <div className="border-3 border-line bg-surface p-1 shadow-[4px_4px_0px_var(--line)]">
              <IndicatorPanel indicators={latest.indicators} />
            </div>
          )}

          <div className="border-3 border-line bg-surface p-1 shadow-[4px_4px_0px_var(--line)]">
            <SignalHistory signals={signals} />
          </div>

          <div className="border-3 border-line bg-surface p-1 shadow-[4px_4px_0px_var(--line)]">
            <BacktestPanel />
          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-line-soft pt-6 text-xs text-subtle">
        Automated technical analysis for research only — not financial advice. Spot signals cannot
        short: a SHORT reading means exit or avoid going long.
      </footer>
    </main>
  )
}
