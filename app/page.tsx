'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BacktestPanel } from '@/components/BacktestPanel'
import { CandleChart } from '@/components/CandleChart'
import { CoinSelector } from '@/components/CoinSelector'
import { IndicatorPanel } from '@/components/IndicatorPanel'
import { OrderHistory } from '@/components/OrderHistory'
import { SignalCard } from '@/components/SignalCard'
import { SignalHistory, type StoredSignal } from '@/components/SignalHistory'
import { useTheme } from '@/components/ThemeToggle'
import { TradePlanCard } from '@/components/TradePlanCard'
import { TradingControls } from '@/components/TradingControls'
import { WalletConnect } from '@/components/WalletConnect'
import { WalletAssetsCard } from '@/components/WalletAssetsCard'
import { VenueSelector } from '@/components/VenueSelector'
import { OrderBookWidget } from '@/components/OrderBookWidget'
import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket'
import type { AssetBalance, LiveOrder } from '@/lib/exchange/client'
import type { StoredTradeOrder } from '@/lib/db/client'
import { formatAge, formatPrice } from '@/lib/format'
import { readJson } from '@/lib/utils'

type PriceResponse = {
  symbol: string
  timeframe: string
  price: number | null
  chainlink: { price: number; updatedAt: number; ageSeconds: number } | null
  divergencePct: number | null
}

type TradesResponse = {
  settings: {
    testnet?: boolean
    enabled?: boolean
    dryRun?: boolean
    killSwitch?: boolean
  }
  orders: StoredTradeOrder[]
  openPosition: StoredTradeOrder | null
  realisedPnl24h: number
  symbol: string
  liveBalances?: {
    balances: AssetBalance[]
    testnet: boolean
    updatedAt: number
  } | null
  liveOrders?: {
    openOrders: LiveOrder[]
    recentOrders: LiveOrder[]
  } | null
}

const REFRESH_MS = 60_000

export default function Page() {
  const { themeStyle, layoutType } = useTheme()
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ETH/USDT')
  const [signals, setSignals] = useState<StoredSignal[]>([])
  const [price, setPrice] = useState<PriceResponse | null>(null)
  const [tradesData, setTradesData] = useState<TradesResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  // Floating canvas viewport & inspector controls
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    'plan' | 'indicators' | 'depth' | 'assets' | 'orders' | 'backtest'
  >('plan')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeSidebarNav, setActiveSidebarNav] = useState<
    'overview' | 'chart' | 'plan' | 'indicators' | 'orders' | 'history' | 'backtest'
  >('overview')

  const isTestnet = Boolean((tradesData?.settings as Record<string, unknown> | undefined)?.testnet)
  const ws = useBinanceWebSocket({
    symbol: selectedSymbol,
    isTestnet,
    enabled: true,
  })
  const [multiColumnMobileTab, setMultiColumnMobileTab] = useState<'stacked' | 'plan' | 'chart' | 'indicators' | 'orders'>('stacked')
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(true)
  const [splitScreenMobileTab, setSplitScreenMobileTab] = useState<'both' | 'chart' | 'confluence' | 'orders'>('both')

  const load = useCallback(async (sym: string = selectedSymbol) => {
    try {
      const [signalsResponse, priceResponse, tradesResponse] = await Promise.all([
        fetch(`/api/signals?limit=50&symbol=${encodeURIComponent(sym)}`),
        fetch(`/api/price?symbol=${encodeURIComponent(sym)}`),
        fetch(`/api/trades?symbol=${encodeURIComponent(sym)}`),
      ])

      const signalsJson = await readJson<{ signals?: StoredSignal[] }>(signalsResponse)
      const priceJson = await readJson<PriceResponse>(priceResponse)
      const tradesJson = await readJson<TradesResponse>(tradesResponse)

      setSignals(signalsJson.signals ?? [])
      setPrice(priceJson)
      setTradesData(tradesJson)
      setUpdatedAt(Date.now())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [selectedSymbol])

  useEffect(() => {
    void load(selectedSymbol)
    const timer = setInterval(() => void load(selectedSymbol), REFRESH_MS)
    return () => clearInterval(timer)
  }, [load, selectedSymbol])

  function handleSelectSymbol(sym: string) {
    setSelectedSymbol(sym)
    void load(sym)
  }

  async function runAnalysis() {
    setRunning(true)
    setError(null)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Analysis failed')
      await load(selectedSymbol)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setRunning(false)
    }
  }

  const latest = signals[0] ?? null

  const isBrutalist = themeStyle === 'brutalist'
  const isPlayful = themeStyle === 'playful'
  const isNeofuturistic = themeStyle === 'neofuturistic'

  // Outer container adaptation based on layout and archetype
  const containerClass =
    layoutType === 'canvas-floating'
      ? 'w-full px-2 sm:px-4 py-3 sm:py-4 min-h-screen'
      : layoutType === 'sidebar'
      ? 'mx-auto max-w-[1680px] px-3 sm:px-4 pt-4 sm:pt-6 pb-20 md:pb-6'
      : layoutType === 'split-screen'
      ? 'mx-auto max-w-[1680px] px-3 sm:px-4 py-4 sm:py-6'
      : 'mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6'

  return (
    <main className={containerClass}>
      {/* Top Header Branding & Global Action Bar */}
      <header
        className={`flex flex-wrap items-center justify-between gap-4 pb-5 ${
          isBrutalist
            ? 'border-b-4 border-line'
            : isPlayful
            ? 'rounded-3xl border-2 border-line bg-surface p-4 shadow-sm'
            : isNeofuturistic
            ? 'rounded-2xl border border-line bg-surface/70 backdrop-blur-md p-4 shadow-lg'
            : 'border-b border-line'
        }`}
      >
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`font-extrabold tracking-tight ${
                  isBrutalist
                    ? 'text-2xl uppercase tracking-tighter'
                    : isPlayful
                    ? 'text-2xl font-black text-accent'
                    : isNeofuturistic
                    ? 'text-xl uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-accent to-up'
                    : 'text-lg font-bold tracking-tight'
                }`}
              >
                ETH SIGNAL {isBrutalist ? '■' : isPlayful ? '🚀' : isNeofuturistic ? '◈' : ''}
              </h1>
              <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase text-subtle">
                {themeStyle}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {price ? `${price.symbol} · ${price.timeframe}` : `${selectedSymbol} · 15m`} — Systematic Spot
              Engine
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <TradingControls />
          <Link
            href="/settings"
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-ink"
            title="Configure layout, themes, alerts, and trading"
          >
            ⚙ Settings
          </Link>
          <WalletConnect />
        </div>
      </header>

      {/* Top 50 Coin Switcher & Market Action Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 p-2.5 shadow-xs">
        <CoinSelector activeSymbol={selectedSymbol} onSelectSymbol={handleSelectSymbol} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={running}
            className={`px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
              isBrutalist
                ? 'border-2 border-line bg-accent text-white hover:translate-x-0.5 hover:translate-y-0.5'
                : isPlayful
                ? 'rounded-full bg-accent text-white px-4 py-1.5 font-black hover:scale-105 shadow-sm'
                : isNeofuturistic
                ? 'rounded-xl bg-gradient-to-r from-accent to-up text-white shadow-sm hover:brightness-110'
                : 'rounded-lg bg-indigo-500 text-white hover:bg-indigo-400'
            }`}
          >
            {running ? 'Evaluating…' : `▶ Analyze ${selectedSymbol.split('/')[0]}`}
          </button>
        </div>
      </div>

      {/* Execution Venue Selector (Binance Default / Hyperliquid Agent / Solana Jupiter) */}
      <div className="mt-2.5">
        <VenueSelector />
      </div>

      {/* Action Controls & Market Price Strip (Mobile Optimised) */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={running}
            className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-bold transition disabled:opacity-50 ${
              isBrutalist
                ? 'border-3 border-line bg-accent text-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[3px_3px_0px_var(--line)]'
                : isPlayful
                ? 'rounded-full bg-accent text-white px-5 py-2 font-black hover:scale-105 shadow-md shadow-accent/25'
                : isNeofuturistic
                ? 'rounded-xl bg-gradient-to-r from-accent to-up text-white shadow-lg shadow-accent/20 hover:brightness-110'
                : 'rounded-lg bg-indigo-500 text-white hover:bg-indigo-400'
            }`}
          >
            {running ? 'Evaluating…' : '▶ Run Analysis'}
          </button>

          <button
            type="button"
            onClick={() => void load()}
            className="px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-lg border border-line text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-ink shrink-0"
          >
            ↻
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-subtle text-[11px]">Binance:</span>
            <span className="font-bold text-ink">
              {formatPrice(ws.ticker?.price ?? price?.price ?? null)}
            </span>
            {ws.status === 'connected' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                Live WS
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-subtle text-[11px]">Oracle:</span>
            <span className="font-bold text-ink">{formatPrice(price?.chainlink?.price ?? null)}</span>
          </div>
          {price?.divergencePct != null && (
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-subtle text-[11px]">Div:</span>
              <span className="font-bold text-ink">{price.divergencePct}%</span>
            </div>
          )}
          {updatedAt ? (
            <span className="text-subtle text-[11px] ml-auto sm:ml-0">Synced {formatAge(updatedAt)}</span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-down">
          {error}
        </p>
      ) : null}

      {/* =========================================================================
          THE 5 USER-SELECTABLE CORE LAYOUTS
         ========================================================================= */}

      {/* -------------------------------------------------------------------------
          1. SIDEBAR NAVIGATION
          Data Density: Medium to High | Mobile: Collapsible menu / horizontal tabs | Focus: Hierarchical navigation
         ------------------------------------------------------------------------- */}
      {layoutType === 'sidebar' && (
        <div className="mt-6 flex flex-col md:flex-row gap-6 items-start">
          {/* Responsive Sleek Sidebar Navigation */}
          <aside
            className={`w-full shrink-0 transition-all duration-300 md:sticky md:top-4 z-10 ${
              sidebarCollapsed ? 'md:w-20' : 'md:w-64'
            }`}
          >
            <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-sm space-y-4">
              {/* Header with expand/collapse toggle */}
              <div className="flex items-center justify-between pb-3 border-b border-line-soft">
                <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'md:hidden' : 'flex'}`}>
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Navigation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={`rounded-xl border border-line p-2 text-xs text-muted hover:bg-surface-2 hover:text-ink transition flex items-center justify-center ${
                    sidebarCollapsed ? 'w-full md:w-auto' : ''
                  }`}
                  title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                  aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  <span className="hidden md:inline">{sidebarCollapsed ? '▶' : '◀'}</span>
                  <span className="md:hidden flex items-center gap-1.5 font-medium">
                    {sidebarCollapsed ? '☰ Show Menu' : '✕ Hide Menu'}
                  </span>
                </button>
              </div>

              {/* Navigation Items (Responsive grid on mobile when open, vertical stack on desktop) */}
              <nav
                className={`gap-1.5 overflow-x-auto pb-1 md:pb-0 md:flex-col ${
                  sidebarCollapsed ? 'hidden md:flex md:items-center' : 'grid grid-cols-2 sm:grid-cols-3 md:flex'
                }`}
              >
                {[
                  { id: 'overview', label: 'Overview', icon: '📊', desc: 'Cockpit View' },
                  { id: 'chart', label: 'Chart', icon: '📈', desc: 'Candlestick Analysis' },
                  { id: 'plan', label: 'Trade Plan', icon: '🎯', desc: 'Signals & Levels' },
                  { id: 'indicators', label: 'Indicators', icon: '⚡', desc: '9-Metric Matrix' },
                  { id: 'orders', label: 'Orders', icon: '📋', desc: 'Executions & P&L' },
                  { id: 'history', label: 'Signal Audit', icon: '📜', desc: 'Signal History' },
                  { id: 'backtest', label: 'Backtester', icon: '🧪', desc: 'Strategy Replay' },
                ].map((item) => {
                  const active = activeSidebarNav === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSidebarNav(item.id as typeof activeSidebarNav)}
                      title={`${item.label} · ${item.desc}`}
                      className={`flex items-center rounded-xl transition-all shrink-0 text-xs font-semibold ${
                        sidebarCollapsed
                          ? 'md:justify-center md:w-11 md:h-11 px-3 py-2 md:px-0 md:py-0'
                          : 'w-full justify-start gap-3 px-3.5 py-2.5'
                      } ${
                        active
                          ? 'bg-accent text-white shadow-md shadow-accent/25 ring-1 ring-accent'
                          : 'text-muted hover:bg-surface-2 hover:text-ink'
                      }`}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span
                        className={`truncate ${
                          sidebarCollapsed ? 'md:hidden' : 'inline'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </nav>

              {/* Confluence Quick Status Pill */}
              {latest && (
                <div
                  className={`rounded-xl border border-line-soft bg-surface-2/70 p-3 text-[11px] space-y-1.5 ${
                    sidebarCollapsed ? 'hidden md:block' : 'block'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-subtle font-medium">Spot Action</span>
                    <span className="font-black text-accent">{latest.plan.action}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-subtle font-medium">Confidence</span>
                    <span className="font-semibold text-ink">{latest.confidence}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-subtle font-medium">Score</span>
                    <span className={`font-mono font-bold ${latest.score >= 0 ? 'text-up' : 'text-down'}`}>
                      {latest.score > 0 ? `+${latest.score}` : latest.score}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Hierarchical Main Workspace Area with Context Breadcrumb Header */}
          <section className="flex-1 min-w-0 space-y-6 w-full">
            {/* View Context Header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-subtle">
                  Active View
                </span>
                <span className="text-muted font-bold">/</span>
                <span className="text-sm font-extrabold capitalize text-ink">
                  {activeSidebarNav}
                </span>
              </div>
              <span className="text-xs text-subtle">
                Systematic ETH Confluence
              </span>
            </div>

            {/* View: Overview */}
            {activeSidebarNav === 'overview' && (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                  <div className="space-y-6 lg:col-span-7 xl:col-span-7 2xl:col-span-8">
                    <div className="rounded-2xl border border-line bg-surface p-2 shadow-xs">
                      <CandleChart limit={500} symbol={selectedSymbol} />
                    </div>
                  </div>
                  <div className="space-y-6 lg:col-span-5 xl:col-span-5 2xl:col-span-4">
                    {latest && <TradePlanCard plan={latest.plan} />}
                    {latest && <SignalCard signal={latest} />}
                  </div>
                </div>
                {latest && <IndicatorPanel indicators={latest.indicators} />}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <WalletAssetsCard
                    balances={tradesData?.liveBalances?.balances}
                    testnet={tradesData?.settings?.testnet}
                    ethPrice={ws.ticker?.price ?? price?.price}
                    onRefresh={load}
                    loading={loading}
                  />
                  <OrderBookWidget
                    orderBook={ws.orderBook}
                    wsConnected={ws.status === 'connected'}
                    symbol={selectedSymbol}
                  />
                </div>
                <OrderHistory
                  orders={tradesData?.orders ?? []}
                  openPosition={tradesData?.openPosition ?? null}
                  realisedPnl24h={tradesData?.realisedPnl24h ?? 0}
                  onRefresh={load}
                  loading={loading}
                  liveOrders={tradesData?.liveOrders}
                  testnet={tradesData?.settings?.testnet}
                />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <SignalHistory signals={signals} />
                  <BacktestPanel />
                </div>
              </>
            )}

            {/* View: Technical Chart */}
            {activeSidebarNav === 'chart' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-line bg-surface p-3 shadow-xs">
                  <CandleChart limit={1000} symbol={selectedSymbol} />
                </div>
                {latest && <IndicatorPanel indicators={latest.indicators} />}
              </div>
            )}

            {/* View: Trade Plan & Action */}
            {activeSidebarNav === 'plan' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {latest && <TradePlanCard plan={latest.plan} />}
                {latest && <SignalCard signal={latest} />}
              </div>
            )}

            {/* View: Indicators */}
            {activeSidebarNav === 'indicators' && latest && (
              <IndicatorPanel indicators={latest.indicators} />
            )}

            {/* View: Order History */}
            {activeSidebarNav === 'orders' && (
              <OrderHistory
                orders={tradesData?.orders ?? []}
                openPosition={tradesData?.openPosition ?? null}
                realisedPnl24h={tradesData?.realisedPnl24h ?? 0}
                onRefresh={load}
                loading={loading}
                liveOrders={tradesData?.liveOrders}
                testnet={tradesData?.settings?.testnet}
              />
            )}

            {/* View: Audit Log */}
            {activeSidebarNav === 'history' && <SignalHistory signals={signals} />}

            {/* View: Backtester */}
            {activeSidebarNav === 'backtest' && <BacktestPanel />}
          </section>

          {/* Mobile App Fixed Bottom Navigation Dock for Sidebar Layout */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line py-1.5 px-2 shadow-xl flex items-center justify-around">
            {[
              { id: 'overview', label: 'Cockpit', icon: '📊' },
              { id: 'chart', label: 'Chart', icon: '📈' },
              { id: 'plan', label: 'Plan', icon: '🎯' },
              { id: 'indicators', label: 'Gauges', icon: '⚡' },
              { id: 'orders', label: 'Orders', icon: '📋' },
              { id: 'history', label: 'Audit', icon: '📜' },
              { id: 'backtest', label: 'Replay', icon: '🧪' },
            ].map((item) => {
              const active = activeSidebarNav === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSidebarNav(item.id as typeof activeSidebarNav)}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition ${
                    active ? 'text-accent scale-105' : 'text-subtle hover:text-ink'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="mt-0.5">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
          2. MULTI-COLUMN WORKSPACE
          Data Density: Very High | Mobile: Collapses into tabs/stacked | Focus: Eliminates back-and-forth
         ------------------------------------------------------------------------- */}
      {layoutType === 'multi-column' && (
        <div className="mt-6 space-y-4">
          {/* Mobile Responsive Column Switcher (Collapses into tabs or stacked cards) */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-line">
            <span className="text-[11px] font-bold text-subtle uppercase tracking-wider shrink-0 mr-1">Column:</span>
            {[
              { id: 'stacked', label: 'All Stacked', icon: '📑' },
              { id: 'plan', label: 'Plan & Signals', icon: '🎯' },
              { id: 'chart', label: 'Chart & Replay', icon: '📈' },
              { id: 'indicators', label: 'Indicators (9)', icon: '⚡' },
              { id: 'orders', label: 'Orders & P&L', icon: '📋' },
            ].map((tab) => {
              const active = multiColumnMobileTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMultiColumnMobileTab(tab.id as typeof multiColumnMobileTab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-accent text-white shadow-xs ring-1 ring-accent'
                      : 'border border-line bg-surface-2 text-muted hover:text-ink'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Left Column: Signals & Trade Action (3.5 cols) */}
            <div
              className={`space-y-6 lg:col-span-4 ${
                multiColumnMobileTab === 'stacked' || multiColumnMobileTab === 'plan'
                  ? 'block'
                  : 'hidden lg:block'
              }`}
            >
              {loading ? (
                <p className="text-sm text-subtle">Loading signals…</p>
              ) : latest ? (
                <>
                  <TradePlanCard plan={latest.plan} />
                  <SignalCard signal={latest} />
                  <div className="rounded-2xl border border-line bg-surface p-1 shadow-xs">
                    <SignalHistory signals={signals} />
                  </div>
                </>
              ) : null}
            </div>

            {/* Center Column: Interactive Canvas Chart & Backtest (5.5 cols) */}
            <div
              className={`space-y-6 lg:col-span-5 ${
                multiColumnMobileTab === 'stacked' || multiColumnMobileTab === 'chart'
                  ? 'block'
                  : 'hidden lg:block'
              }`}
            >
              <div className="rounded-2xl border border-line bg-surface p-2 shadow-xs">
                <CandleChart limit={500} symbol={selectedSymbol} />
              </div>
              <div className="rounded-2xl border border-line bg-surface p-1 shadow-xs">
                <BacktestPanel />
              </div>
            </div>

            {/* Right Column: 9 Indicators Breakdown & Deep Matrix (3 cols) */}
            <div
              className={`space-y-6 lg:col-span-3 ${
                multiColumnMobileTab === 'stacked' || multiColumnMobileTab === 'indicators'
                  ? 'block'
                  : 'hidden lg:block'
              }`}
            >
              {latest && <IndicatorPanel indicators={latest.indicators} />}
            </div>

            {/* Lower Full-Width Execution Audit & Order History Strip (12 cols) */}
            <div
              className={`lg:col-span-12 ${
                multiColumnMobileTab === 'stacked' || multiColumnMobileTab === 'orders'
                  ? 'block'
                  : 'hidden lg:block'
              }`}
            >
              <OrderHistory
                orders={tradesData?.orders ?? []}
                openPosition={tradesData?.openPosition ?? null}
                realisedPnl24h={tradesData?.realisedPnl24h ?? 0}
                onRefresh={load}
                loading={loading}
                liveOrders={tradesData?.liveOrders}
                testnet={tradesData?.settings?.testnet}
              />
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
          3. CANVAS & FLOATING PANEL
          Data Density: Infinite / Flexible | Mobile: Touch scaling | Focus: Deep visual immersion
         ------------------------------------------------------------------------- */}
      {layoutType === 'canvas-floating' && (
        <div className="mt-6 space-y-6">
          {/* Dominant Deep-Immersion Chart Canvas with Floating HUD */}
          <div className="relative rounded-3xl border border-line bg-surface/40 backdrop-blur-sm overflow-hidden p-3 shadow-md">
            <div className="w-full">
              <CandleChart limit={500} symbol={selectedSymbol} />
            </div>

            {/* Floating Glass Inspector HUD / Cockpit Dock */}
            <div className="mt-4 lg:mt-0 lg:absolute lg:top-6 lg:right-6 lg:w-[380px] rounded-2xl border border-line/80 bg-surface/95 backdrop-blur-xl p-4 shadow-2xl z-20 space-y-3.5 transition-all">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">Inspector Dock</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Floating Tab Selector */}
                  <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInspectorTab('plan')
                        setMobileInspectorOpen(true)
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        activeInspectorTab === 'plan' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInspectorTab('indicators')
                        setMobileInspectorOpen(true)
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        activeInspectorTab === 'indicators' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Gauges
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInspectorTab('depth')
                        setMobileInspectorOpen(true)
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        activeInspectorTab === 'depth' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Depth
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInspectorTab('assets')
                        setMobileInspectorOpen(true)
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        activeInspectorTab === 'assets' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Assets
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInspectorTab('orders')
                        setMobileInspectorOpen(true)
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        activeInspectorTab === 'orders' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Orders
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInspectorTab('backtest')
                        setMobileInspectorOpen(true)
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        activeInspectorTab === 'backtest' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Backtest
                    </button>
                  </div>

                  {/* Mobile collapse / expand toggle */}
                  <button
                    type="button"
                    onClick={() => setMobileInspectorOpen(!mobileInspectorOpen)}
                    className="lg:hidden p-1.5 rounded-lg border border-line bg-surface-2 text-xs text-muted hover:text-ink"
                    title={mobileInspectorOpen ? 'Collapse HUD' : 'Expand HUD'}
                  >
                    {mobileInspectorOpen ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {/* Inspector Dock Body with custom scrolling */}
              <div className={`space-y-3.5 pr-1 ${mobileInspectorOpen ? 'max-h-[520px] overflow-y-auto block' : 'hidden lg:block'}`}>
                {activeInspectorTab === 'plan' && latest && (
                  <>
                    <TradePlanCard plan={latest.plan} />
                    <SignalCard signal={latest} />
                  </>
                )}
                {activeInspectorTab === 'indicators' && latest && (
                  <IndicatorPanel indicators={latest.indicators} />
                )}
                {activeInspectorTab === 'depth' && (
                  <OrderBookWidget
                    orderBook={ws.orderBook}
                    wsConnected={ws.status === 'connected'}
                    symbol={selectedSymbol}
                  />
                )}
                {activeInspectorTab === 'assets' && (
                  <WalletAssetsCard
                    balances={tradesData?.liveBalances?.balances}
                    testnet={tradesData?.settings?.testnet}
                    ethPrice={ws.ticker?.price ?? price?.price}
                    onRefresh={load}
                    loading={loading}
                  />
                )}
                {activeInspectorTab === 'orders' && (
                  <OrderHistory
                    orders={tradesData?.orders ?? []}
                    openPosition={tradesData?.openPosition ?? null}
                    realisedPnl24h={tradesData?.realisedPnl24h ?? 0}
                    onRefresh={load}
                    loading={loading}
                    liveOrders={tradesData?.liveOrders}
                    testnet={tradesData?.settings?.testnet}
                  />
                )}
                {activeInspectorTab === 'backtest' && <BacktestPanel />}
              </div>
            </div>
          </div>

          {/* Lower Full-Width Execution Audit & Signal Strip */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <WalletAssetsCard
                balances={tradesData?.liveBalances?.balances}
                testnet={tradesData?.settings?.testnet}
                ethPrice={ws.ticker?.price ?? price?.price}
                onRefresh={load}
                loading={loading}
              />
              <OrderBookWidget
                orderBook={ws.orderBook}
                wsConnected={ws.status === 'connected'}
                symbol={selectedSymbol}
              />
            </div>
            <OrderHistory
              orders={tradesData?.orders ?? []}
              openPosition={tradesData?.openPosition ?? null}
              realisedPnl24h={tradesData?.realisedPnl24h ?? 0}
              onRefresh={load}
              loading={loading}
              liveOrders={tradesData?.liveOrders}
              testnet={tradesData?.settings?.testnet}
            />
            <div className="rounded-3xl border border-line bg-surface p-4 shadow-xs">
              <SignalHistory signals={signals} />
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
          4. BENTO GRID
          Data Density: Medium | Mobile: Re-stacks vertically 1-col | Focus: Overview and scannability
         ------------------------------------------------------------------------- */}
      {layoutType === 'bento-grid' && (
        <div className="mt-6 space-y-4">
          {/* Quick Mobile Scannability Jump Bar (lg:hidden) */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-line">
            <span className="text-[11px] font-bold text-subtle uppercase tracking-wider shrink-0 mr-1">Jump:</span>
            {[
              { id: 'bento-chart', label: 'Chart', icon: '📈' },
              { id: 'bento-assets', label: 'Assets', icon: '💰' },
              { id: 'bento-depth', label: 'Depth', icon: '📖' },
              { id: 'bento-plan', label: 'Plan', icon: '🎯' },
              { id: 'bento-score', label: 'Score', icon: '⚡' },
              { id: 'bento-backtest', label: 'Backtest', icon: '🧪' },
              { id: 'bento-indicators', label: 'Indicators', icon: '📊' },
              { id: 'bento-orders', label: 'Orders', icon: '📋' },
              { id: 'bento-history', label: 'Audit', icon: '📜' },
            ].map((b) => (
              <a
                key={b.id}
                href={`#${b.id}`}
                className="px-2.5 py-1 rounded-xl border border-line bg-surface text-xs font-semibold text-muted hover:text-ink shrink-0 flex items-center gap-1"
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
            {/* Bento Cell 1: Main Chart (8 cols) */}
            <div id="bento-chart" className="lg:col-span-8 rounded-3xl border border-line bg-surface p-3 sm:p-4 shadow-sm flex flex-col justify-between">
              <div className="mb-3 flex items-center justify-between border-b border-line-soft pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  15m Technical Confluence Chart
                </span>
                <span className="text-[10px] font-semibold text-accent rounded-full bg-accent-soft px-2 py-0.5">
                  Binance + Chainlink
                </span>
              </div>
              <CandleChart limit={500} symbol={selectedSymbol} />
            </div>

            {/* Bento Cell 2: Actionable Trade Plan (4 cols) */}
            <div id="bento-plan" className="lg:col-span-4 rounded-3xl border border-line bg-surface p-2 shadow-sm flex flex-col justify-between">
              {latest && <TradePlanCard plan={latest.plan} />}
            </div>

            {/* Bento Cell 3: Signal Score & Confidence (5 cols) */}
            <div id="bento-score" className="lg:col-span-5 rounded-3xl border border-line bg-surface p-2 shadow-sm">
              {latest && <SignalCard signal={latest} />}
            </div>

            {/* Bento Cell 4: Backtest Strategy Performance (7 cols) */}
            <div id="bento-backtest" className="lg:col-span-7 rounded-3xl border border-line bg-surface p-2 shadow-sm">
              <BacktestPanel />
            </div>

            {/* Bento Cell 5: 9 Technical Indicators Panel (12 cols) */}
            <div id="bento-indicators" className="lg:col-span-12 rounded-3xl border border-line bg-surface p-2 shadow-sm">
              {latest && <IndicatorPanel indicators={latest.indicators} />}
            </div>

            {/* Bento Cell: Live Exchange Assets (6 cols) */}
            <div id="bento-assets" className="lg:col-span-6 rounded-3xl border border-line bg-surface p-2 shadow-sm">
              <WalletAssetsCard
                balances={tradesData?.liveBalances?.balances}
                testnet={tradesData?.settings?.testnet}
                ethPrice={ws.ticker?.price ?? price?.price}
                onRefresh={load}
                loading={loading}
              />
            </div>

            {/* Bento Cell: Live Order Book Depth (6 cols) */}
            <div id="bento-depth" className="lg:col-span-6 rounded-3xl border border-line bg-surface p-2 shadow-sm">
              <OrderBookWidget
                orderBook={ws.orderBook}
                wsConnected={ws.status === 'connected'}
                symbol={selectedSymbol}
              />
            </div>

            {/* Bento Cell 6: Order & Execution History (12 cols) */}
            <div id="bento-orders" className="lg:col-span-12 rounded-3xl border border-line bg-surface p-2 shadow-sm">
              <OrderHistory
                orders={tradesData?.orders ?? []}
                openPosition={tradesData?.openPosition ?? null}
                realisedPnl24h={tradesData?.realisedPnl24h ?? 0}
                onRefresh={load}
                loading={loading}
                liveOrders={tradesData?.liveOrders}
                testnet={tradesData?.settings?.testnet}
              />
            </div>

            {/* Bento Cell 7: Audit Log (12 cols) */}
            <div id="bento-history" className="lg:col-span-12 rounded-3xl border border-line bg-surface p-2 shadow-sm">
              <SignalHistory signals={signals} />
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
          5. SPLIT-SCREEN
          Data Density: Low to Medium | Mobile: Stacked sequentially | Focus: Side-by-side comparison
         ------------------------------------------------------------------------- */}
      {layoutType === 'split-screen' && (
        <div className="mt-6 space-y-4">
          {/* Mobile Split View Selector (xl:hidden) */}
          <div className="xl:hidden flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-line">
            <span className="text-[11px] font-bold text-subtle uppercase tracking-wider shrink-0 mr-1">Split View:</span>
            {[
              { id: 'both', label: 'Sequential (Both)', icon: '↕' },
              { id: 'chart', label: 'Market Dynamics', icon: '📈' },
              { id: 'confluence', label: 'Confluence & Audit', icon: '🎯' },
              { id: 'orders', label: 'Orders & Executions', icon: '📋' },
            ].map((tab) => {
              const active = splitScreenMobileTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSplitScreenMobileTab(tab.id as typeof splitScreenMobileTab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-accent text-white shadow-xs ring-1 ring-accent'
                      : 'border border-line bg-surface-2 text-muted hover:text-ink'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Left Split Pane: Visual Market Dynamics & Candlesticks (7 cols) */}
            <div
              className={`space-y-6 xl:col-span-7 xl:sticky xl:top-4 ${
                splitScreenMobileTab === 'both' || splitScreenMobileTab === 'chart'
                  ? 'block'
                  : 'hidden xl:block'
              }`}
            >
              <div className="rounded-3xl border border-line bg-surface p-4 shadow-md">
                <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                      Primary Market Dynamics (ETH/USDT Spot)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-subtle">15m Candles</span>
                </div>
                <CandleChart limit={500} symbol={selectedSymbol} />
              </div>

              <div className="rounded-3xl border border-line bg-surface p-2 shadow-xs">
                <BacktestPanel />
              </div>
            </div>

            {/* Right Split Pane: Algorithmic Confluence & Trade Audit (5 cols) */}
            <div
              className={`space-y-6 xl:col-span-5 ${
                splitScreenMobileTab === 'both' ||
                splitScreenMobileTab === 'confluence' ||
                splitScreenMobileTab === 'orders'
                  ? 'block'
                  : 'hidden xl:block'
              }`}
            >
              {latest && <TradePlanCard plan={latest.plan} />}
              {latest && <SignalCard signal={latest} />}
              {latest && <IndicatorPanel indicators={latest.indicators} />}
              <div className="grid grid-cols-1 gap-4">
                <WalletAssetsCard
                  balances={tradesData?.liveBalances?.balances}
                  testnet={tradesData?.settings?.testnet}
                  ethPrice={ws.ticker?.price ?? price?.price}
                  onRefresh={load}
                  loading={loading}
                />
                <OrderBookWidget
                  orderBook={ws.orderBook}
                  wsConnected={ws.status === 'connected'}
                  symbol={selectedSymbol}
                />
              </div>
              <OrderHistory
                orders={tradesData?.orders ?? []}
                openPosition={tradesData?.openPosition ?? null}
                realisedPnl24h={tradesData?.realisedPnl24h ?? 0}
                onRefresh={load}
                loading={loading}
                liveOrders={tradesData?.liveOrders}
                testnet={tradesData?.settings?.testnet}
              />
              <div className="rounded-3xl border border-line bg-surface p-2 shadow-xs">
                <SignalHistory signals={signals} />
              </div>
            </div>
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
