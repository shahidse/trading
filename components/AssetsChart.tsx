'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { formatUsd, formatPkr, formatCurrency, DEFAULT_PKR_RATE } from '@/lib/currency'
import { EquityChartSkeleton } from '@/components/Loader'

export type PortfolioAsset = {
  asset: string
  amount: number
  free: number
  locked: number
  priceUsd: number
  usdValue: number
  pkrValue: number
  allocationPct: number
}

export type PortfolioHistoryPoint = {
  timestamp: number
  totalUsd: number
  totalPkr: number
}

export type PortfolioData = {
  totalUsd: number
  totalPkr: number
  pkrRate: number
  change24hUsd: number
  change24hPkr: number
  change24hPct: number
  environment: string
  exchangeConnected: boolean
  assets: PortfolioAsset[]
  history: PortfolioHistoryPoint[]
  updatedAt: number
}

type Timeframe = '24H' | '7D' | '30D' | 'ALL'

const ASSET_COLORS: Record<string, string> = {
  USDT: '#10B981', // Emerald
  ETH: '#6366F1',  // Indigo
  BTC: '#F59E0B',  // Amber
  SOL: '#8B5CF6',  // Purple
  BNB: '#FBBF24',  // Yellow
  XRP: '#06B6D4',  // Cyan
  DOGE: '#EAB308', // Gold
  PEPE: '#22C55E', // Green
}

const DEFAULT_COLOR = '#3B82F6'

export function AssetsChart() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD')
  const [timeframe, setTimeframe] = useState<Timeframe>('7D')
  const [hoverPoint, setHoverPoint] = useState<{
    x: number
    y: number
    point: PortfolioHistoryPoint
  } | null>(null)
  const [converterUsd, setConverterUsd] = useState<string>('100')
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Load user's currency preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eth_signal_currency')
      if (saved === 'PKR' || saved === 'USD') {
        setCurrency(saved)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleCurrencyChange = (curr: 'USD' | 'PKR') => {
    setCurrency(curr)
    try {
      localStorage.setItem('eth_signal_currency', curr)
    } catch {
      // ignore
    }
  }

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Error fetching portfolio data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
    const timer = setInterval(fetchPortfolio, 30_000)
    return () => clearInterval(timer)
  }, [])

  // Filter history based on timeframe
  const filteredHistory = useMemo(() => {
    if (!data?.history || data.history.length === 0) return []
    const now = Date.now()
    const cutoff = {
      '24H': now - 24 * 60 * 60 * 1000,
      '7D': now - 7 * 24 * 60 * 60 * 1000,
      '30D': now - 30 * 24 * 60 * 60 * 1000,
      ALL: 0,
    }[timeframe]

    const pts = data.history.filter((p) => p.timestamp >= cutoff)
    return pts.length > 1 ? pts : data.history
  }, [data?.history, timeframe])

  // Chart dimensions & scaling
  const width = 800
  const height = 260
  const padding = { top: 20, right: 25, bottom: 35, left: 25 }

  const chartData = useMemo(() => {
    if (filteredHistory.length === 0) return null

    const values = filteredHistory.map((p) =>
      currency === 'PKR' ? p.totalPkr : p.totalUsd,
    )
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1

    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const points = filteredHistory.map((p, i) => {
      const val = currency === 'PKR' ? p.totalPkr : p.totalUsd
      const x = padding.left + (i / (filteredHistory.length - 1)) * chartW
      const y = padding.top + chartH - ((val - minVal) / range) * chartH
      return { x, y, raw: p }
    })

    // Construct SVG path
    const pathD = points.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`
      const prev = arr[i - 1]
      const cx = (prev.x + pt.x) / 2
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`
    }, '')

    const areaD = `${pathD} L ${points[points.length - 1].x} ${
      height - padding.bottom
    } L ${points[0].x} ${height - padding.bottom} Z`

    const isPositive =
      points.length > 1 &&
      (currency === 'PKR'
        ? points[points.length - 1].raw.totalPkr >= points[0].raw.totalPkr
        : points[points.length - 1].raw.totalUsd >= points[0].raw.totalUsd)

    return { points, pathD, areaD, minVal, maxVal, isPositive }
  }, [filteredHistory, currency])

  const pkrRate = data?.pkrRate ?? DEFAULT_PKR_RATE
  const totalDisplay = data
    ? currency === 'PKR'
      ? formatPkr(data.totalPkr)
      : formatUsd(data.totalUsd)
    : '—'

  const changeDisplay = data
    ? currency === 'PKR'
      ? `${data.change24hPkr >= 0 ? '+' : ''}${formatPkr(data.change24hPkr)}`
      : `${data.change24hUsd >= 0 ? '+' : ''}${formatUsd(data.change24hUsd)}`
    : '—'

  const isUp = (data?.change24hUsd ?? 0) >= 0

  // Interactive mouse tracker
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartData || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * width

    // Find nearest point
    let nearest = chartData.points[0]
    let minDist = Math.abs(nearest.x - mouseX)
    for (const pt of chartData.points) {
      const dist = Math.abs(pt.x - mouseX)
      if (dist < minDist) {
        minDist = dist
        nearest = pt
      }
    }
    setHoverPoint({ x: nearest.x, y: nearest.y, point: nearest.raw })
  }

  const handleMouseLeave = () => {
    setHoverPoint(null)
  }

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all">
        <EquityChartSkeleton />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all">
      {/* Top Header: Total Net Worth, Currency Toggle & 24h PnL */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Total Assets Valuation
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                data?.environment === 'testnet'
                  ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                  : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {data?.environment === 'testnet' ? 'Spot Testnet' : 'Live Binance'}
            </span>
            <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-subtle">
              1 USD = ₨ {pkrRate.toFixed(2)}
            </span>
          </div>

          <div className="mt-1 flex items-baseline gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink font-mono">
              {loading ? 'Loading...' : totalDisplay}
            </h2>
            {data && (
              <span
                className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                  isUp
                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
                }`}
              >
                <span>{isUp ? '▲' : '▼'}</span>
                <span>{changeDisplay}</span>
                <span className="font-mono">({data.change24hPct >= 0 ? '+' : ''}{data.change24hPct.toFixed(2)}%)</span>
              </span>
            )}
          </div>
        </div>

        {/* Currency Switcher & Timeframe selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* PKR Rupees / USD Toggle Switch */}
          <div className="flex items-center rounded-xl border border-line bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => handleCurrencyChange('USD')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                currency === 'USD'
                  ? 'bg-accent text-white shadow-sm ring-1 ring-accent'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <span>💵</span>
              <span>USD ($)</span>
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyChange('PKR')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                currency === 'PKR'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <span>🇵🇰</span>
              <span>PKR (₨)</span>
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center rounded-xl border border-line bg-surface-2 p-1">
            {(['24H', '7D', '30D', 'ALL'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  timeframe === tf
                    ? 'bg-surface text-ink font-semibold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Equity Curve Chart */}
      <div className="relative mt-5 overflow-hidden rounded-xl border border-line-soft bg-surface-2/40 p-2">
        {chartData ? (
          <div className="relative w-full">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto overflow-visible cursor-crosshair select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* Glow & Area Fill Gradient */}
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={chartData.isPositive ? '#10B981' : '#6366F1'}
                    stopOpacity="0.32"
                  />
                  <stop
                    offset="100%"
                    stopColor={chartData.isPositive ? '#10B981' : '#6366F1'}
                    stopOpacity="0.0"
                  />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Horizontal Reference Grid Lines */}
              {[0, 0.33, 0.66, 1].map((pct, idx) => {
                const y = padding.top + (height - padding.top - padding.bottom) * pct
                const val = chartData.maxVal - pct * (chartData.maxVal - chartData.minVal)
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.08"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={width - padding.right + 4}
                      y={y + 3}
                      fill="currentColor"
                      className="text-[9px] fill-subtle font-mono"
                    >
                      {currency === 'PKR' ? formatPkr(val, true) : formatUsd(val, true)}
                    </text>
                  </g>
                )
              })}

              {/* Gradient Area Fill */}
              <path d={chartData.areaD} fill="url(#equityGradient)" />

              {/* Main Glowing Curve Stroke */}
              <path
                d={chartData.pathD}
                fill="none"
                stroke={chartData.isPositive ? '#10B981' : '#6366F1'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />

              {/* Interactive Crosshair & Tooltip */}
              {hoverPoint && (
                <g>
                  {/* Vertical Guideline */}
                  <line
                    x1={hoverPoint.x}
                    y1={padding.top}
                    x2={hoverPoint.x}
                    y2={height - padding.bottom}
                    stroke="currentColor"
                    strokeOpacity="0.25"
                    strokeDasharray="3 3"
                  />
                  {/* Glowing Marker Dot */}
                  <circle
                    cx={hoverPoint.x}
                    cy={hoverPoint.y}
                    r="5"
                    fill={chartData.isPositive ? '#10B981' : '#6366F1'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                </g>
              )}

              {/* Bottom Date/Time labels */}
              {chartData.points.length > 0 && (
                <g className="text-[10px] fill-subtle font-mono">
                  <text x={padding.left} y={height - 10} textAnchor="start">
                    {new Date(chartData.points[0].raw.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </text>
                  <text x={width / 2} y={height - 10} textAnchor="middle">
                    {new Date(
                      chartData.points[Math.floor(chartData.points.length / 2)].raw.timestamp,
                    ).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </text>
                  <text x={width - padding.right} y={height - 10} textAnchor="end">
                    {new Date(
                      chartData.points[chartData.points.length - 1].raw.timestamp,
                    ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </text>
                </g>
              )}
            </svg>

            {/* Hover Floating Tooltip */}
            {hoverPoint && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-xl backdrop-blur-md"
                style={{
                  left: `${(hoverPoint.x / width) * 100}%`,
                  top: `${Math.max(10, (hoverPoint.y / height) * 100 - 30)}%`,
                }}
              >
                <p className="text-[10px] font-medium text-subtle">
                  {new Date(hoverPoint.point.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-sm font-bold text-ink font-mono mt-0.5">
                  {currency === 'PKR'
                    ? formatPkr(hoverPoint.point.totalPkr)
                    : formatUsd(hoverPoint.point.totalUsd)}
                </p>
                <p className="text-[11px] text-muted font-mono">
                  {currency === 'PKR'
                    ? `≈ ${formatUsd(hoverPoint.point.totalUsd)}`
                    : `≈ ${formatPkr(hoverPoint.point.totalPkr)}`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-52 items-center justify-center text-xs text-subtle">
            {loading ? 'Calculating portfolio equity curve...' : 'No historical snapshots available'}
          </div>
        )}
      </div>

      {/* Asset Allocation Multi-Segment Progress Bar */}
      {data?.assets && data.assets.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">Asset Allocation</span>
            <span className="text-muted">
              {data.assets.length} tokens held · Dual USD / PKR Valuation
            </span>
          </div>

          {/* Allocation Bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2 p-0.5">
            {data.assets.map((asset) => {
              if (asset.allocationPct < 1) return null
              const color = ASSET_COLORS[asset.asset] || DEFAULT_COLOR
              return (
                <div
                  key={asset.asset}
                  style={{
                    width: `${asset.allocationPct}%`,
                    backgroundColor: color,
                  }}
                  title={`${asset.asset}: ${asset.allocationPct}% (${formatCurrency(
                    asset.usdValue,
                    currency,
                    pkrRate,
                  )})`}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                />
              )
            })}
          </div>

          {/* Grid of Token Allocation Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {data.assets.slice(0, 8).map((asset) => {
              const color = ASSET_COLORS[asset.asset] || DEFAULT_COLOR
              return (
                <div
                  key={asset.asset}
                  className="rounded-xl border border-line-soft bg-surface-2/60 p-2.5 transition hover:border-line"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-bold text-ink">{asset.asset}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-muted">
                      {asset.allocationPct}%
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <span className="text-xs font-mono font-bold text-ink truncate">
                      {currency === 'PKR' ? formatPkr(asset.pkrValue) : formatUsd(asset.usdValue)}
                    </span>
                    <span className="text-[10px] text-subtle font-mono truncate">
                      {asset.amount > 1000
                        ? asset.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })
                        : asset.amount.toFixed(4)}
                    </span>
                  </div>

                  <div className="mt-0.5 flex justify-between text-[9px] text-subtle">
                    <span>
                      {currency === 'PKR' ? formatUsd(asset.usdValue) : formatPkr(asset.pkrValue)}
                    </span>
                    {asset.priceUsd > 0 && asset.asset !== 'USDT' && (
                      <span>${asset.priceUsd.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Interactive PKR Quick Currency Calculator */}
      <div className="mt-5 rounded-xl border border-line bg-surface-2/70 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">💱</span>
            <div>
              <span className="text-xs font-semibold text-ink">
                Quick PKR Conversion Calculator
              </span>
              <p className="text-[11px] text-muted">
                Real-time official interbank conversion rate: 1 USD = ₨ {pkrRate.toFixed(2)} PKR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-subtle">$</span>
              <input
                type="number"
                min="0"
                value={converterUsd}
                onChange={(e) => setConverterUsd(e.target.value)}
                placeholder="USD"
                className="w-24 rounded-lg border border-line bg-surface py-1 pl-6 pr-2 text-xs font-mono text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <span className="text-xs text-subtle">=</span>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
              {formatPkr(Number(converterUsd || 0) * pkrRate)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
