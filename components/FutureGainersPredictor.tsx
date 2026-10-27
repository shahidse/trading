'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type {
  FutureCoinPrediction,
  PredictionsPayload,
  FutureGainHorizon,
  PredictionCatalyst,
} from '@/lib/data/predictions'
import { formatUsd, formatPkr, DEFAULT_PKR_RATE } from '@/lib/currency'
import { CardSkeleton } from '@/components/Loader'
import { SquarePostModal } from '@/components/SquarePostModal'

type SortOption = 'confidence' | 'upside' | 'riskReward'

interface FutureGainersPredictorProps {
  activeSymbol?: string
  onSelectSymbol?: (symbol: string) => void
}

export function FutureGainersPredictor({
  activeSymbol,
  onSelectSymbol,
}: FutureGainersPredictorProps) {
  const [data, setData] = useState<PredictionsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  // Filters & Controls
  const [selectedHorizon, setSelectedHorizon] = useState<FutureGainHorizon | 'ALL'>('ALL')
  const [selectedCatalyst, setSelectedCatalyst] = useState<PredictionCatalyst | 'ALL'>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('confidence')
  const [searchQuery, setSearchQuery] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD')
  const [pkrRate, setPkrRate] = useState<number>(DEFAULT_PKR_RATE)
  const [viewMode, setViewMode] = useState<'scroll' | 'expand'>('scroll')
  const [squareModalPred, setSquareModalPred] = useState<FutureCoinPrediction | null>(null)
  const [shareResult, setShareResult] = useState<{ symbol: string; ok: boolean; message: string } | null>(null)

  const handleShareToSquare = (pred: FutureCoinPrediction) => {
    setSquareModalPred(pred)
  }

  // Load user's currency preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eth_signal_currency')
      if (saved === 'PKR' || saved === 'USD') {
        setCurrency(saved)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  function handleCurrencyToggle(curr: 'USD' | 'PKR') {
    setCurrency(curr)
    try {
      localStorage.setItem('eth_signal_currency', curr)
    } catch {
      // Ignore localStorage errors
    }
  }

  // Fetch predictions data
  const fetchPredictions = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await fetch('/api/predictions')
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const json: PredictionsPayload = await res.json()
      setData(json)
      setLastUpdated(Date.now())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchPredictions()
    // Auto-refresh predictions every 90 seconds
    const interval = setInterval(() => {
      void fetchPredictions()
    }, 90_000)
    return () => clearInterval(interval)
  }, [])

  // Fetch PKR rate
  useEffect(() => {
    async function loadPkr() {
      try {
        const res = await fetch('/api/portfolio')
        if (res.ok) {
          const json = await res.json()
          if (json.pkrRate && Number.isFinite(json.pkrRate)) {
            setPkrRate(json.pkrRate)
          }
        }
      } catch {
        // Fallback to default
      }
    }
    void loadPkr()
  }, [])

  // Unique categories from predictions
  const categories = useMemo(() => {
    if (!data?.predictions) return []
    const set = new Set<string>()
    data.predictions.forEach((p) => set.add(p.category))
    return Array.from(set)
  }, [data])

  // Filtered and sorted predictions
  const filteredPredictions = useMemo(() => {
    if (!data?.predictions) return []

    let list = [...data.predictions]

    if (selectedHorizon !== 'ALL') {
      list = list.filter((p) => p.horizon === selectedHorizon)
    }

    if (selectedCatalyst !== 'ALL') {
      list = list.filter((p) => p.catalyst === selectedCatalyst)
    }

    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.base.toLowerCase().includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'confidence') {
        return b.confidenceScore - a.confidenceScore
      }
      if (sortBy === 'upside') {
        return b.predictedGainPctMax - a.predictedGainPctMax
      }
      if (sortBy === 'riskReward') {
        return b.riskRewardRatio - a.riskRewardRatio
      }
      return 0
    })

    return list
  }, [data, selectedHorizon, selectedCatalyst, selectedCategory, searchQuery, sortBy])

  // Helper to format values with selected currency
  const formatVal = (usdVal: number, compact = false) => {
    if (currency === 'PKR') {
      return formatPkr(usdVal * pkrRate, compact)
    }
    return formatUsd(usdVal, compact)
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-3.5 sm:p-5 shadow-xs transition-all space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-line pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-lg text-accent">
              🔮
            </span>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Multi-Day Future Gainers & AI Surge Forecaster
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Multi-Day AI Model
            </span>
          </div>
          <p className="text-xs text-subtle max-w-2xl">
            Algorithmic forward-looking model predicting coins poised to pump in future days (Next 24H, 3-5 Days Swing, 7-Day Macro) based on smart money absorption, range compression squeezes, and daily trend momentum.
          </p>
        </div>

        {/* Currency & Refresh Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Currency Toggle */}
          <div className="flex items-center rounded-xl border border-line bg-surface-2 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleCurrencyToggle('USD')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                currency === 'USD'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-subtle hover:text-ink'
              }`}
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyToggle('PKR')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                currency === 'PKR'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-subtle hover:text-ink'
              }`}
            >
              ₨ PKR
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => void fetchPredictions(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-3 transition-all disabled:opacity-50"
            title="Refresh future predictions"
          >
            <span className={`text-sm ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span>{refreshing ? 'Analyzing...' : 'Refresh AI'}</span>
          </button>
        </div>
      </div>

      {/* Top AI Picks & Sentiment Highlight Cards */}
      {data && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Best 24H Quick Surge */}
          {data.topPicks.best24h && (
            <div
              onClick={() => onSelectSymbol?.(data.topPicks.best24h!.symbol)}
              className="cursor-pointer rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 hover:border-amber-500/50 transition-all hover:scale-[1.01] group"
            >
              <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">
                <span className="flex items-center gap-1">⚡ Top 24H Surge Pick</span>
                <span className="bg-amber-500/15 px-2 py-0.5 rounded-md">
                  {data.topPicks.best24h.confidenceScore}% Conf
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-base font-bold text-ink group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                    {data.topPicks.best24h.base}
                  </div>
                  <div className="text-xs text-subtle">{data.topPicks.best24h.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    +{data.topPicks.best24h.predictedGainPctMin}% ~ +{data.topPicks.best24h.predictedGainPctMax}%
                  </div>
                  <div className="text-[11px] text-subtle">
                    Target: {formatVal(data.topPicks.best24h.targetPriceLow)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Best 3-5 Days Swing */}
          {data.topPicks.best3Days && (
            <div
              onClick={() => onSelectSymbol?.(data.topPicks.best3Days!.symbol)}
              className="cursor-pointer rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 hover:border-indigo-500/50 transition-all hover:scale-[1.01] group"
            >
              <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-semibold mb-1">
                <span className="flex items-center gap-1">🚀 Best 3-5D Swing Pick</span>
                <span className="bg-indigo-500/15 px-2 py-0.5 rounded-md">
                  {data.topPicks.best3Days.confidenceScore}% Conf
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-base font-bold text-ink group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                    {data.topPicks.best3Days.base}
                  </div>
                  <div className="text-xs text-subtle">{data.topPicks.best3Days.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    +{data.topPicks.best3Days.predictedGainPctMin}% ~ +{data.topPicks.best3Days.predictedGainPctMax}%
                  </div>
                  <div className="text-[11px] text-subtle">
                    Target: {formatVal(data.topPicks.best3Days.targetPriceLow)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Best 7-Day Macro Pick */}
          {data.topPicks.best7Days && (
            <div
              onClick={() => onSelectSymbol?.(data.topPicks.best7Days!.symbol)}
              className="cursor-pointer rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 hover:border-purple-500/50 transition-all hover:scale-[1.01] group"
            >
              <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 font-semibold mb-1">
                <span className="flex items-center gap-1">💎 Best 7-Day Macro Pick</span>
                <span className="bg-purple-500/15 px-2 py-0.5 rounded-md">
                  {data.topPicks.best7Days.confidenceScore}% Conf
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-base font-bold text-ink group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                    {data.topPicks.best7Days.base}
                  </div>
                  <div className="text-xs text-subtle">{data.topPicks.best7Days.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    +{data.topPicks.best7Days.predictedGainPctMin}% ~ +{data.topPicks.best7Days.predictedGainPctMax}%
                  </div>
                  <div className="text-[11px] text-subtle">
                    Target: {formatVal(data.topPicks.best7Days.targetPriceLow)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Breadth & Accumulation Bias */}
          <div className="rounded-xl border border-line bg-surface-2 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-subtle font-semibold">
              <span>📈 Market Bullish Breadth</span>
              <span className="text-ink font-bold">{data.marketBreadth.bullishPercent}% Bullish</span>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-accent transition-all duration-500"
                  style={{ width: `${data.marketBreadth.bullishPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-subtle">
                <span>Avg Projected Gain:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  +{data.marketBreadth.averagePredictedGain}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3 pt-2">
        {/* Horizon Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 text-xs font-semibold fancy-scrollbar-subtle">
          <span className="text-subtle shrink-0 pr-1">Horizon:</span>
          {(
            [
              { id: 'ALL', label: 'All Horizons', icon: '🌐' },
              { id: '24H', label: 'Next 24H (Quick Surge)', icon: '⚡' },
              { id: '3_DAYS', label: '3-5 Days (Swing Momentum)', icon: '🚀' },
              { id: '7_DAYS', label: '7 Days (Macro Trend)', icon: '💎' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedHorizon(tab.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all shrink-0 ${
                selectedHorizon === tab.id
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-ink'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Catalyst & Sort Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Catalyst Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 fancy-scrollbar-subtle">
            <span className="text-subtle shrink-0 pr-1">Catalyst:</span>
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'WHALE_ACCUMULATION', label: '🐳 Whale Inflow' },
                { id: 'VOLATILITY_SQUEEZE', label: '💥 Squeeze' },
                { id: 'DAILY_GOLDEN_CROSS', label: '📈 Golden Cross' },
                { id: 'OVERSOLD_REVERSAL', label: '🔄 Reversal' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatalyst(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all shrink-0 ${
                  selectedCatalyst === cat.id
                    ? 'bg-ink text-surface'
                    : 'bg-surface-2 text-subtle hover:text-ink hover:bg-surface-3'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search coin (e.g. ETH, SOL)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-1 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none w-full sm:w-44 flex-1"
            />

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink font-semibold focus:border-accent focus:outline-none shrink-0"
            >
              <option value="confidence">Highest Confidence</option>
              <option value="upside">Maximum Upside %</option>
              <option value="riskReward">Best Risk:Reward</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={5} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-xs text-rose-600 dark:text-rose-400">
          <p className="font-semibold">Unable to load coin predictions</p>
          <p className="mt-1 text-subtle">{error}</p>
          <button
            type="button"
            onClick={() => void fetchPredictions(true)}
            className="mt-3 rounded-lg bg-rose-500/20 px-3 py-1 font-semibold hover:bg-rose-500/30 transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Prediction Cards Grid Header & Scroll Control */}
      {!loading && !error && filteredPredictions.length > 0 && (
        <div className="flex items-center justify-between text-xs text-subtle px-1 pt-1 border-t border-line/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">
              Ranked Forecasts ({filteredPredictions.length} coins)
            </span>
            <span className="hidden sm:inline text-[11px] text-muted">
              • {viewMode === 'scroll' ? 'Contained fancy scroller active' : 'Full height view'}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-0.5 border border-line">
            <button
              type="button"
              onClick={() => setViewMode('scroll')}
              title="Compact scrollable container (prevents endless page stretching)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'scroll'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-subtle hover:text-ink'
              }`}
            >
              <span>↕️</span>
              <span className="hidden sm:inline">Scroller</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('expand')}
              title="Expand all cards to full height"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'expand'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-subtle hover:text-ink'
              }`}
            >
              <span>⤢</span>
              <span className="hidden sm:inline">Expand All</span>
            </button>
          </div>
        </div>
      )}

      {/* Prediction Cards Grid Container */}
      {!loading && !error && filteredPredictions.length > 0 && (
        <div
          className={`transition-all duration-300 ${
            viewMode === 'scroll'
              ? 'max-h-[660px] xl:max-h-[740px] overflow-y-auto fancy-scrollbar pr-2 pb-2 rounded-2xl border border-line-soft bg-surface-2/20 p-2 shadow-inner'
              : ''
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPredictions.map((pred) => {
            const isSelected = activeSymbol === pred.symbol

            // Horizon badge colors
            const horizonBg =
              pred.horizon === '24H'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                : pred.horizon === '3_DAYS'
                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30'
                : 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30'

            // Risk badge colors
            const riskBg =
              pred.riskLevel === 'LOW'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                : pred.riskLevel === 'MODERATE'
                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'

            // Rank badge styling
            const rankStyle =
              pred.rank === 1
                ? 'bg-amber-500 text-white font-extrabold shadow-xs shadow-amber-500/30'
                : pred.rank === 2
                ? 'bg-slate-400 text-white font-extrabold'
                : pred.rank === 3
                ? 'bg-amber-700 text-white font-extrabold'
                : 'bg-surface-3 text-subtle font-semibold'

            const tracked = data?.trackedSquarePredictions?.find(
              (t) => t.symbol === pred.symbol && (t.horizon === pred.horizon || !t.horizon)
            )

            return (
              <div
                key={pred.symbol}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 relative overflow-hidden group ${
                  isSelected
                    ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
                    : 'border-line bg-surface-2 hover:border-line-active hover:shadow-md'
                }`}
              >
                {/* Top Row: Rank, Coin Identity, Live Price */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs ${rankStyle}`}>
                        #{pred.rank}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-ink text-base tracking-tight">{pred.base}</span>
                          <span className="text-[11px] text-subtle font-semibold">/{pred.symbol.split('/')[1]}</span>
                          <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-subtle">
                            {pred.category}
                          </span>
                          {tracked?.status === 'TARGET_MET' && (
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                              🎯 Target Met
                            </span>
                          )}
                          {tracked?.status === 'PENDING' && (
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              ⏳ Square Armed
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-subtle truncate max-w-[140px] block">{pred.name}</span>
                      </div>
                    </div>

                    {/* Price and 24h Change */}
                    <div className="text-right">
                      <div className="text-sm font-bold text-ink">{formatVal(pred.currentPrice)}</div>
                      <span
                        className={`inline-block text-xs font-semibold ${
                          pred.change24h >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {pred.change24h >= 0 ? '+' : ''}
                        {pred.change24h}%
                      </span>
                    </div>
                  </div>

                  {/* AI Prediction Spotlight Banner */}
                  <div className="mt-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        🎯 Predicted Upside
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${horizonBg}`}>
                        {pred.horizonLabel}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                        +{pred.predictedGainPctMin}% ~ +{pred.predictedGainPctMax}%
                      </span>
                      <span className="text-xs font-semibold text-subtle">
                        {pred.confidenceScore}% Confidence
                      </span>
                    </div>

                    {/* Probability Confidence Meter */}
                    <div className="h-1.5 w-full rounded-full bg-emerald-500/20 overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 dark:bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${pred.confidenceScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Strategic Execution Grid */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-line bg-surface p-2.5">
                      <span className="text-[11px] text-subtle block">Target Range</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {formatVal(pred.targetPriceLow)} - {formatVal(pred.targetPriceHigh)}
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-surface p-2.5">
                      <span className="text-[11px] text-subtle block">Buy Zone (Entry)</span>
                      <span className="font-bold text-ink text-xs">
                        {formatVal(pred.entryZoneLow)} - {formatVal(pred.entryZoneHigh)}
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-surface p-2.5">
                      <span className="text-[11px] text-subtle block">Stop Loss Floor</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400 text-xs">
                        {formatVal(pred.stopLossPrice)} (-{pred.stopLossPct}%)
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-surface p-2.5">
                      <span className="text-[11px] text-subtle block">Risk / Reward</span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-accent text-xs">{pred.riskRewardRatio}:1</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${riskBg}`}>
                          {pred.riskLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Estimation on 1k USD or 100k PKR */}
                  <div className="mt-2 text-[11px] text-subtle rounded-lg bg-surface p-2 border border-line flex items-center justify-between">
                    <span>Est. Return on {currency === 'PKR' ? '₨ 100k' : '$1,000'}:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {currency === 'PKR'
                        ? `+₨ ${Math.round(100_000 * (pred.predictedGainPctMin / 100)).toLocaleString()} ~ +₨ ${Math.round(
                            100_000 * (pred.predictedGainPctMax / 100)
                          ).toLocaleString()}`
                        : `+$${pred.profitEstimate1kUsd.min} ~ +$${pred.profitEstimate1kUsd.max}`}
                    </span>
                  </div>

                  {/* AI Thesis & Catalyst Explanation */}
                  <div className="mt-3 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-ink">
                      <span>💡</span>
                      <span>{pred.catalystTitle}</span>
                    </div>
                    <p className="text-subtle text-[11px] leading-relaxed line-clamp-3">
                      {pred.thesis}
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-line flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-subtle">
                      24h Vol: {formatUsd(pred.quoteVolume, true)}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleShareToSquare(pred)}
                        title="Choose template and publish this prediction to Binance Square"
                        className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-500/20 active:scale-95 dark:text-amber-400"
                      >
                        <span>📢</span>
                        <span>Square</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectSymbol?.(pred.symbol)}
                        className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-accent/90 transition-all shrink-0"
                      >
                        <span>📈</span>
                        <span>Analyze Chart</span>
                      </button>
                    </div>
                  </div>
                  {shareResult && shareResult.symbol === pred.symbol && (
                    <div
                      className={`text-right text-[11px] font-medium truncate ${
                        shareResult.ok ? 'text-emerald-500' : 'text-rose-400'
                      }`}
                      title={shareResult.message}
                    >
                      {shareResult.ok ? '✅ ' : '⚠️ '}
                      {shareResult.message}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredPredictions.length === 0 && (
        <div className="rounded-xl border border-line bg-surface-2 p-8 text-center text-xs text-subtle">
          <p className="text-base font-semibold text-ink">No coin predictions match your current filter</p>
          <p className="mt-1">Try selecting &quot;All Horizons&quot; or clearing your search query.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedHorizon('ALL')
              setSelectedCatalyst('ALL')
              setSelectedCategory('ALL')
              setSearchQuery('')
            }}
            className="mt-3 rounded-lg bg-accent/15 px-3 py-1 font-semibold text-accent hover:bg-accent/25 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Footer Info & Model Disclaimer */}
      <div className="border-t border-line pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-subtle">
        <div className="flex items-center gap-2">
          <span>🧠 Predictive Algorithm: Multi-day Range Compression & Smart Money Inflow</span>
          {lastUpdated && (
            <span>• Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
          )}
        </div>
        <span className="text-muted italic">
          Systematic quantitative bounds. Always practice risk management and stop-loss discipline.
        </span>
      </div>

      {/* Binance Square Posting Modal with Template Selector */}
      {squareModalPred && (
        <SquarePostModal
          isOpen={Boolean(squareModalPred)}
          onClose={() => setSquareModalPred(null)}
          type="prediction"
          prediction={squareModalPred}
          onPublished={(res) => {
            setShareResult({
              symbol: squareModalPred.symbol,
              ok: res.ok,
              message: res.ok
                ? res.contentId
                  ? 'Posted to Square! Target milestone tracking armed.'
                  : 'Posted! Target milestone tracking armed.'
                : res.message,
            })
          }}
        />
      )}
    </section>
  )
}
