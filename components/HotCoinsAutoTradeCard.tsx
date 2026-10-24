'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '@/lib/format'
import { readJson } from '@/lib/utils'
import { Spinner } from '@/components/Loader'
import type { PublicHotCoinTradingSettings } from '@/lib/exchange/hot-coins-settings'
import type { HotCoinEvaluation, HotCoinExecutionReport } from '@/lib/exchange/hot-coins-trader'

type HotCoinsTradeResponse = {
  settings: PublicHotCoinTradingSettings
  evaluation: HotCoinEvaluation | null
  openPositions: Array<{
    symbol: string
    quantity: number
    price: number | null
    notionalUsd: number
    createdAt: number
    environment: string
  }>
}

const inputClass =
  'mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none transition'
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-subtle'

export function HotCoinsAutoTradeCard({
  compact = false,
  onExecutionDone,
}: {
  compact?: boolean
  onExecutionDone?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [lastReport, setLastReport] = useState<HotCoinExecutionReport | null>(null)

  const [data, setData] = useState<HotCoinsTradeResponse | null>(null)

  // Form State
  const [enabled, setEnabled] = useState(false)
  const [topCoinsCount, setTopCoinsCount] = useState(3)
  const [minHeatScore, setMinHeatScore] = useState(70)
  const [orderNotionalUsd, setOrderNotionalUsd] = useState('50')
  const [maxNotionalUsd, setMaxNotionalUsd] = useState('100')
  const [dailyLossLimitUsd, setDailyLossLimitUsd] = useState('50')
  const [maxDailyTrades, setMaxDailyTrades] = useState('6')
  const [cooldownMinutes, setCooldownMinutes] = useState('60')
  const [useOcoBracket, setUseOcoBracket] = useState(true)
  const [stopLossPct, setStopLossPct] = useState('3.0')
  const [takeProfitPct, setTakeProfitPct] = useState('6.0')
  const [dryRun, setDryRun] = useState(true)

  const apply = useCallback((settings: PublicHotCoinTradingSettings) => {
    setEnabled(settings.enabled)
    setTopCoinsCount(settings.topCoinsCount)
    setMinHeatScore(settings.minHeatScore)
    setOrderNotionalUsd(String(settings.orderNotionalUsd))
    setMaxNotionalUsd(String(settings.maxNotionalUsd))
    setDailyLossLimitUsd(String(settings.dailyLossLimitUsd))
    setMaxDailyTrades(String(settings.maxDailyTrades))
    setCooldownMinutes(String(settings.cooldownMinutes))
    setUseOcoBracket(settings.useOcoBracket)
    setStopLossPct(String(settings.stopLossPct))
    setTakeProfitPct(String(settings.takeProfitPct))
    setDryRun(settings.dryRun)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hot-coins/trade')
      if (!res.ok) throw new Error('Failed to load hot coins trade settings')
      const json = await readJson<HotCoinsTradeResponse>(res)
      setData(json)
      apply(json.settings)
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not load configuration',
      })
    } finally {
      setLoading(false)
    }
  }, [apply])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setBusy(true)
    setStatus(null)

    try {
      const res = await fetch('/api/hot-coins/trade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          topCoinsCount: Number(topCoinsCount),
          minHeatScore: Number(minHeatScore),
          orderNotionalUsd: Number(orderNotionalUsd),
          maxNotionalUsd: Number(maxNotionalUsd),
          dailyLossLimitUsd: Number(dailyLossLimitUsd),
          maxDailyTrades: Number(maxDailyTrades),
          cooldownMinutes: Number(cooldownMinutes),
          useOcoBracket,
          stopLossPct: Number(stopLossPct),
          takeProfitPct: Number(takeProfitPct),
          dryRun,
        }),
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.error ?? 'Failed to save settings')
      }

      const json = await res.json()
      apply(json.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      setStatus({ kind: 'ok', text: 'Hot coin trading settings updated successfully!' })
      void load()
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleEnabled() {
    const next = !enabled
    setEnabled(next)
    setBusy(true)
    try {
      const res = await fetch('/api/hot-coins/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: next ? 'enable' : 'disable' }),
      })
      const json = await res.json()
      if (json.settings) apply(json.settings)
      setStatus({
        kind: 'ok',
        text: next ? '🤖 Auto-buying top hot coins ARMED' : '⏸️ Auto-buying top hot coins paused',
      })
      void load()
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to toggle',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleExecuteNow() {
    setExecuting(true)
    setStatus(null)
    setLastReport(null)

    try {
      const res = await fetch('/api/hot-coins/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute_top', force: true, topCount: topCoinsCount }),
      })

      const report = (await res.json()) as HotCoinExecutionReport
      setLastReport(report)

      if (report.executedCount > 0) {
        setStatus({
          kind: 'ok',
          text: `Success: ${report.message}`,
        })
      } else {
        setStatus({
          kind: 'ok',
          text: report.message || 'Execution evaluated (0 orders placed)',
        })
      }

      void load()
      if (onExecutionDone) onExecutionDone()
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Execution failed',
      })
    } finally {
      setExecuting(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6 flex items-center justify-center gap-3">
        <Spinner size="sm" color="accent" />
        <span className="text-xs text-subtle font-medium">Loading hot coin trade settings…</span>
      </div>
    )
  }

  const evalCandidates = data?.evaluation?.topCandidates ?? []
  const eligibleCoins = data?.evaluation?.eligibleToBuy ?? []
  const activePositions = data?.openPositions ?? []

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/95 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all">
      {/* Decorative ambient background */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent blur-3xl" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h3 className="text-base font-bold tracking-tight text-ink flex items-center gap-2">
              Hot Coins Auto-Execution Engine
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                dryRun
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {dryRun ? '🛡️ Dry-Run Simulated' : '⚡ Live Orders'}
            </span>
          </div>
          <p className="mt-1 text-xs text-subtle">
            Automatically buys the Top {topCoinsCount} ranked breakout coins when their Heat Score qualifies, with strict custom limits &amp; OCO brackets.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Main Toggle Switch */}
          <button
            type="button"
            disabled={busy || executing}
            onClick={handleToggleEnabled}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
              enabled
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-surface-2 hover:bg-surface border border-line text-muted hover:text-ink'
            }`}
          >
            {busy ? <Spinner size="xs" color={enabled ? 'white' : 'accent'} /> : null}
            <span>{enabled ? '🟢 Auto-Buy ARMED' : '⚪ Auto-Buy PAUSED'}</span>
          </button>

          {/* 1-Click Execute Now Button */}
          <button
            type="button"
            disabled={executing || busy}
            onClick={handleExecuteNow}
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executing ? (
              <>
                <Spinner size="xs" color="white" />
                <span>Executing Top {topCoinsCount}…</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Execute Top {topCoinsCount} Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {status && (
        <div
          className={`mt-4 rounded-2xl border p-3 text-xs flex items-center justify-between gap-2 ${
            status.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
          }`}
        >
          <span>{status.text}</span>
          <button
            type="button"
            onClick={() => setStatus(null)}
            className="text-subtle hover:text-ink font-bold text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Execution Results Summary Banner (if just ran) */}
      {lastReport && (
        <div className="mt-4 rounded-2xl border border-line bg-surface-2/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span>Last Execution Report</span>
            <span className="text-[10px] text-subtle font-mono">
              {new Date(lastReport.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {lastReport.orders.map((o) => (
              <div
                key={o.symbol}
                className="rounded-xl border border-line bg-surface p-2 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-ink">{o.symbol}</span>
                  <span className="ml-1 text-[10px] text-amber-400">({o.heatScore}%)</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    o.outcome.status === 'placed' || o.outcome.status === 'dry-run'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {o.outcome.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Candidates & Active Positions Quick View */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Next in Queue to be Bought */}
        <div className="rounded-2xl border border-line bg-surface-2/40 p-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-line text-xs">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <span>🎯</span> Top Eligible Coins to Buy ({eligibleCoins.length}/{topCoinsCount})
            </span>
            <span className="text-[10px] text-subtle">Min Heat: {minHeatScore}%</span>
          </div>

          <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto fancy-scrollbar-subtle pr-1">
            {evalCandidates.length === 0 ? (
              <p className="text-xs text-subtle py-3 text-center">Scanning candidate altcoins…</p>
            ) : (
              evalCandidates.slice(0, 5).map((cand) => (
                <div
                  key={cand.coin.symbol}
                  className={`rounded-xl border p-2.5 flex items-center justify-between text-xs transition ${
                    cand.eligible
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-line/60 bg-surface/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-subtle">
                      #{cand.coin.rank}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink">{cand.coin.base}</span>
                        <span className="text-[10px] text-amber-400 font-semibold font-mono">
                          {cand.coin.heatScore}% Heat
                        </span>
                      </div>
                      <p className="text-[10px] text-subtle">
                        ${formatPrice(cand.coin.price)} · Target: ${formatPrice(cand.levels.takeProfit)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {cand.eligible ? (
                      <span className="rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                        Ready to Buy
                      </span>
                    ) : (
                      <span
                        className="rounded-md bg-surface-2 border border-line text-muted px-2 py-0.5 text-[9px] font-medium truncate max-w-[140px] inline-block"
                        title={cand.skipReason}
                      >
                        {cand.skipReason}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Currently Open Hot Coin Positions */}
        <div className="rounded-2xl border border-line bg-surface-2/40 p-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-line text-xs">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <span>💼</span> Active Hot Coin Positions ({activePositions.length})
            </span>
            <span className="text-[10px] text-subtle">
              Total: ${activePositions.reduce((acc, p) => acc + p.notionalUsd, 0).toFixed(2)}
            </span>
          </div>

          <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto fancy-scrollbar-subtle pr-1">
            {activePositions.length === 0 ? (
              <p className="text-xs text-subtle py-6 text-center">
                No open hot coin positions. They will appear here once executed.
              </p>
            ) : (
              activePositions.map((pos) => (
                <div
                  key={`${pos.symbol}-${pos.createdAt}`}
                  className="rounded-xl border border-line bg-surface p-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-ink">{pos.symbol}</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        {pos.quantity} units
                      </span>
                    </div>
                    <p className="text-[10px] text-subtle">
                      Bought at ${formatPrice(pos.price ?? 0)} · ~${pos.notionalUsd.toFixed(2)}
                    </p>
                  </div>
                  <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold px-2 py-0.5">
                    {pos.environment}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Configuration Settings Form */}
      <form onSubmit={handleSave} className="mt-5 border-t border-line pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <span>⚙️</span> Execution Configuration &amp; Risk Guards
          </h4>
          <span className="text-[11px] text-subtle">Independent from ETH Signal strategy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Top Coins Count */}
          <div>
            <label className={labelClass}>Top Coins Count</label>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 5].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setTopCoinsCount(cnt)}
                  className={`flex-1 rounded-xl py-2 font-bold text-xs transition border ${
                    topCoinsCount === cnt
                      ? 'border-accent bg-accent text-white shadow-xs'
                      : 'border-line bg-surface-2 text-muted hover:text-ink'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          {/* Order Limit / Size per Coin */}
          <div>
            <label className={labelClass}>Order Limit per Coin ($ USD)</label>
            <input
              type="number"
              step="5"
              min="10"
              max="5000"
              value={orderNotionalUsd}
              onChange={(e) => setOrderNotionalUsd(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Max Ceiling Hard Cap */}
          <div>
            <label className={labelClass}>Order Ceiling Cap ($ USD)</label>
            <input
              type="number"
              step="10"
              min="10"
              max="10000"
              value={maxNotionalUsd}
              onChange={(e) => setMaxNotionalUsd(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Daily Loss Limit */}
          <div>
            <label className={labelClass}>Daily Loss Limit ($ USD)</label>
            <input
              type="number"
              step="10"
              min="10"
              max="10000"
              value={dailyLossLimitUsd}
              onChange={(e) => setDailyLossLimitUsd(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Min Heat Score */}
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass}>Min Heat Score</label>
              <span className="font-bold text-amber-400 font-mono text-xs">{minHeatScore}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={minHeatScore}
              onChange={(e) => setMinHeatScore(Number(e.target.value))}
              className="mt-2 w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Max Daily Trades */}
          <div>
            <label className={labelClass}>Max Daily Hot Trades</label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxDailyTrades}
              onChange={(e) => setMaxDailyTrades(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Cooldown Minutes */}
          <div>
            <label className={labelClass}>Re-buy Cooldown (Minutes)</label>
            <input
              type="number"
              min="5"
              max="1440"
              step="15"
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Dry Run / Real Toggle */}
          <div>
            <label className={labelClass}>Execution Safety Mode</label>
            <button
              type="button"
              onClick={() => setDryRun(!dryRun)}
              className={`mt-1 w-full rounded-xl py-2 px-3 font-bold text-xs transition border flex items-center justify-between ${
                dryRun
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              }`}
            >
              <span>{dryRun ? '🛡️ Dry-Run Simulated' : '⚠️ Live Exchange'}</span>
              <span className="text-[10px] underline">Toggle</span>
            </button>
          </div>
        </div>

        {/* OCO Bracket and TP/SL options */}
        <div className="rounded-2xl border border-line bg-surface-2/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useOcoBracket}
                onChange={(e) => setUseOcoBracket(e.target.checked)}
                className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
              />
              <span className="text-xs font-bold text-ink">
                Attach Binance Native OCO Bracket (Automatic TP &amp; Stop Loss)
              </span>
            </label>
            <span className="text-[11px] text-subtle">Derives from AI Breakout levels</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <label className={labelClass}>Fallback Stop-Loss %</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="20"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fallback Take-Profit %</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={takeProfitPct}
                onChange={(e) => setTakeProfitPct(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={load}
            disabled={busy || executing}
            className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={busy || executing}
            className={`rounded-xl px-5 py-2 text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              saved
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-accent hover:bg-accent-hover text-white shadow-accent/20'
            }`}
          >
            {busy ? (
              <>
                <Spinner size="xs" color="white" />
                <span>Saving…</span>
              </>
            ) : saved ? (
              <>
                <span>✓</span>
                <span>Configuration Saved!</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
