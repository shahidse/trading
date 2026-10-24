'use client'

import { useEffect, useState } from 'react'
import type { ScannedHotCoin, ScannerResult } from '@/lib/data/scanner'
import { readJson } from '@/lib/utils'
import { HotCoinsRadarSkeleton, Spinner } from '@/components/Loader'

type HotCoinsRadarProps = {
  activeSymbol: string
  onSelectSymbol: (symbol: string) => void
}

function formatVolume(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

function formatPrice(val: number): string {
  if (val <= 0) return '$0.00'
  if (val < 0.0001) return `$${val.toFixed(8)}`
  if (val < 0.01) return `$${val.toFixed(6)}`
  if (val < 1) return `$${val.toFixed(4)}`
  return `$${val.toFixed(2)}`
}

export function HotCoinsRadar({ activeSymbol, onSelectSymbol }: HotCoinsRadarProps) {
  const [data, setData] = useState<ScannerResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'breakout' | 'hot' | 'pre-pump' | 'pullback' | 'gainers'>('breakout')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [expanded, setExpanded] = useState(false)

  async function loadScanner() {
    try {
      const res = await fetch('/api/scanner')
      if (!res.ok) return
      const json = await readJson<ScannerResult>(res)
      setData(json)
    } catch {
      // Degrade gracefully
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadScanner()
    const timer = setInterval(() => void loadScanner(), 20_000)
    return () => clearInterval(timer)
  }, [])

  const categoryPool = !data
    ? []
    : filterCategory === 'All'
    ? (data.allCoins ?? data.hotCoins)
    : (data.allCoins ?? data.hotCoins).filter((c) =>
        c.category.toLowerCase().includes(filterCategory.toLowerCase()),
      )

  const sortFn = (a: ScannedHotCoin, b: ScannedHotCoin) =>
    b.heatScore - a.heatScore || b.rangePositionPct - a.rangePositionPct || b.quoteVolume - a.quoteVolume

  const currentList: ScannedHotCoin[] = !data
    ? []
    : activeTab === 'breakout'
    ? (() => {
        const breakouts = categoryPool.filter(
          (c) => c.signalType === 'BREAKOUT_IMMINENT' || c.signalType === 'MOMENTUM_SURGE',
        )
        return [...(breakouts.length > 0 ? breakouts : categoryPool)].sort(sortFn)
      })()
    : activeTab === 'hot'
    ? [...categoryPool].sort(sortFn)
    : activeTab === 'pre-pump'
    ? (() => {
        const prepumps = categoryPool.filter((c) => c.signalType === 'PRE_PUMP_ACCUMULATION')
        return [...(prepumps.length > 0 ? prepumps : categoryPool)].sort(sortFn)
      })()
    : activeTab === 'pullback'
    ? (() => {
        const pullbacks = categoryPool.filter((c) => c.signalType === 'PULLBACK_BOUNCE')
        return [...(pullbacks.length > 0 ? pullbacks : categoryPool)].sort(sortFn)
      })()
    : [...categoryPool].sort((a, b) => b.change24h - a.change24h)

  const filteredCoins = currentList

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface/90 backdrop-blur-md p-4 sm:p-6 shadow-lg">
      {/* Background ambient decorative glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-3xl" />

      {/* Header bar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
            <h2 className="text-base font-bold tracking-tight text-ink flex items-center gap-2">
              🔥 Hot Coins & Breakout Radar
            </h2>
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>Live AI Scanner</span>
              {loading && <Spinner size="xs" color="accent" />}
            </span>
          </div>
          <p className="mt-1 text-xs text-subtle">
            Predicts which altcoins, memes, and AI tokens are building volume surges and preparing to pump across 75+ liquid pairs.
          </p>
        </div>

        {/* Tab Switchers */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-surface-2/80 p-1">
          {[
            { id: 'breakout', label: '🔥 Breakout Imminent', icon: '⚡' },
            { id: 'hot', label: 'Top Heat Radar', icon: '🎯' },
            { id: 'pre-pump', label: '💎 Pre-Pump Accumulation', icon: '📦' },
            { id: 'pullback', label: '⚡ Dip & Bounce', icon: '🛡️' },
            { id: 'gainers', label: 'Top Gainers', icon: '🚀' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-subtle hover:text-ink hover:bg-surface'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs fancy-scrollbar-subtle">
        <span className="text-[11px] font-semibold text-subtle mr-1 shrink-0">Sector:</span>
        {['All', 'Meme', 'Fan Token', 'AI / Data', 'Layer 1', 'DeFi', 'Layer 2'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition shrink-0 ${
              filterCategory === cat
                ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border border-line bg-surface-2 text-muted hover:text-ink'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Coin Grid Container with fancy-scrollbar when expanded */}
      <div
        className={`mt-4 transition-all duration-300 ${
          expanded ? 'max-h-[640px] overflow-y-auto fancy-scrollbar pr-2 p-1 rounded-2xl border border-line-soft bg-surface-2/30 shadow-inner' : ''
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {loading && !data ? (
          <div className="col-span-full space-y-4">
            <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-line bg-surface-2/70 py-3.5 shadow-xs">
              <Spinner size="sm" color="accent" />
              <span className="text-xs font-semibold text-ink">
                Scanning 75+ coin order books, volume spikes & breakout zones…
              </span>
            </div>
            <HotCoinsRadarSkeleton />
          </div>
        ) : filteredCoins.length === 0 ? (
          <div className="col-span-full py-8 text-center text-sm text-subtle flex flex-col items-center justify-center gap-2">
            <p>No active setups found matching &quot;{filterCategory}&quot; right now.</p>
            <button
              type="button"
              onClick={() => {
                setFilterCategory('All')
                setActiveTab('hot')
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent hover:text-accent transition shadow-xs"
            >
              <span>🔄</span>
              <span>Reset Filter & Show All Hot Coins</span>
            </button>
          </div>
        ) : (
          filteredCoins.slice(0, expanded ? 36 : 12).map((coin, index) => {
            const isSelected = activeSymbol === coin.symbol
            const isPump = coin.change24h >= 0
            const isTopPick = index === 0

            return (
              <div
                key={coin.symbol}
                className={`group relative rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isSelected
                    ? 'border-accent bg-accent-soft/40 shadow-xs ring-1 ring-accent'
                    : isTopPick
                    ? 'border-amber-500/70 bg-gradient-to-br from-amber-500/10 via-surface to-surface shadow-md ring-2 ring-amber-400/30'
                    : 'border-line bg-surface/70 hover:border-line-hover hover:bg-surface'
                }`}
              >
                {/* #1 Top Pick Banner */}
                {isTopPick && (
                  <div className="mb-2.5 flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs animate-pulse">
                      👑 #1 TOP PUMP PICK ({coin.heatScore}%)
                    </span>
                    <span className="text-[10px] font-bold text-amber-400">
                      ⚡ HIGHEST ODDS
                    </span>
                  </div>
                )}

                {/* Top card info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shadow-xs ${
                        coin.rank === 1
                          ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/30'
                          : coin.rank === 2
                          ? 'bg-slate-300 text-slate-900 ring-2 ring-slate-300/30'
                          : coin.rank === 3
                          ? 'bg-amber-700 text-amber-100 ring-2 ring-amber-700/30'
                          : 'border border-line bg-surface-2 text-subtle'
                      }`}
                    >
                      #{coin.rank}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink text-sm">{coin.base}</span>
                        <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.2 text-[9px] font-semibold uppercase text-subtle">
                          {coin.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted truncate max-w-[130px]">{coin.name}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-ink">
                      ${coin.price < 0.01 ? coin.price.toFixed(6) : coin.price < 1 ? coin.price.toFixed(4) : coin.price.toFixed(2)}
                    </p>
                    <p className={`text-xs font-bold ${isPump ? 'text-up' : 'text-down'}`}>
                      {isPump ? '+' : ''}{coin.change24h}%
                    </p>
                  </div>
                </div>

                {/* Heat & Probability Score Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-subtle">Breakout Probability</span>
                    <span
                      className={`font-black ${
                        coin.heatScore >= 85
                          ? 'text-amber-400'
                          : coin.heatScore >= 70
                          ? 'text-emerald-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      {coin.heatScore}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden border border-line/40">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        coin.heatScore >= 85
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                          : coin.heatScore >= 70
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${coin.heatScore}%` }}
                    />
                  </div>
                </div>

                {/* 24h Range Position Indicator */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-subtle border-t border-line/50 pt-2">
                  <span>24h Range</span>
                  <span className="font-semibold text-ink">
                    {coin.rangePositionPct}% of 24h High
                  </span>
                  <span>Vol: {formatVolume(coin.quoteVolume)}</span>
                </div>

                {/* Trade Setup: Entry & Exit Levels */}
                <div className="mt-2.5 rounded-xl border border-line bg-surface-2/70 p-2.5 space-y-2 text-xs">
                  {/* Expected Window */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold text-subtle text-[11px]">
                      <span>⏱️</span> Timing Window:
                    </span>
                    <span
                      className={`font-bold text-[10px] px-2 py-0.5 rounded-md border ${
                        coin.pumpWindow === 'IMMINENT_15M'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 animate-pulse'
                          : coin.pumpWindow === 'SHORT_TERM_1H'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                      }`}
                    >
                      {coin.expectedPumpTime}
                    </span>
                  </div>

                  {/* Entry & Stop Loss (Risk Exit) Badges */}
                  <div className="grid grid-cols-2 gap-1.5 border-t border-line/40 pt-2">
                    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-1.5">
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-semibold">
                        <span>🟢 Entry Zone</span>
                      </div>
                      <p className="font-mono text-xs font-bold text-ink mt-0.5">
                        {formatPrice(coin.entryPrice ?? coin.price)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-1.5">
                      <div className="flex items-center justify-between text-[10px] text-rose-400 font-semibold">
                        <span>🔴 Stop Loss</span>
                        <span className="text-[9px] font-mono">-{coin.stopLossPct ?? 2.0}%</span>
                      </div>
                      <p className="font-mono text-xs font-bold text-ink mt-0.5">
                        {formatPrice(coin.stopLossPrice ?? coin.price * 0.98)}
                      </p>
                    </div>
                  </div>

                  {/* Take-Profit Exit Level */}
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-amber-400 flex items-center gap-1">
                        <span>🎯 Target (Exit)</span>
                      </span>
                      <span className="font-bold text-emerald-400 font-mono">
                        +{coin.predictedUpsidePct}% ~ +{coin.predictedUpsideMaxPct}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-xs font-bold text-ink">
                        {formatPrice(coin.targetPrice)}
                      </span>
                      <span className="text-[10px] font-bold text-cyan-300 font-mono">
                        1 : {coin.riskRewardRatio ?? 2.5} R:R
                      </span>
                    </div>
                  </div>

                  {/* Est. Return */}
                  <div className="flex items-center justify-between text-[10px] text-subtle border-t border-dashed border-line/40 pt-1">
                    <span>Gain on $1k:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      +${coin.expectedGainPer1k} ~ +${coin.expectedGainMaxPer1k}
                    </span>
                  </div>
                </div>

                {/* Predicted action badge & 1-click select */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      coin.signalType === 'BREAKOUT_IMMINENT'
                        ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400 animate-pulse'
                        : coin.signalType === 'MOMENTUM_SURGE'
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : coin.signalType === 'PRE_PUMP_ACCUMULATION'
                        ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                        : 'border border-line bg-surface-2 text-muted'
                    }`}
                  >
                    {coin.signalType === 'BREAKOUT_IMMINENT'
                      ? '⚡ Breakout Imminent'
                      : coin.signalType === 'MOMENTUM_SURGE'
                      ? '🚀 Momentum Surge'
                      : coin.signalType === 'PRE_PUMP_ACCUMULATION'
                      ? '💎 Accumulation'
                      : '🔄 Pullback Dip'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectSymbol(coin.symbol)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-accent text-white shadow-xs'
                        : 'border border-line bg-surface-2 text-ink hover:bg-accent hover:text-white'
                    }`}
                  >
                    <span>{isSelected ? '✓ Active' : 'Analyze'}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
        </div>
      </div>
      {filteredCoins.length > 12 && (
        <div className="flex justify-center pt-3 border-t border-line/40 mt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-5 py-2.5 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shadow-xs cursor-pointer"
          >
            <span>{expanded ? '▲ Collapse Watchlist' : `▼ Show All (${filteredCoins.length}) Breakout Setups`}</span>
          </button>
        </div>
      )}
    </section>
  )
}
