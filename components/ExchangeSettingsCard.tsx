'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '@/lib/format'
import type { StoredTradeOrder } from '@/lib/db/client'
import { readJson } from '@/lib/utils'

type PublicExchangeSettings = {
  enabled: boolean
  killSwitch: boolean
  dryRun: boolean
  testnet: boolean
  notionalUsd: number
  maxNotionalUsd: number
  dailyLossLimitUsd: number
  maxDailyTrades: number
  useOcoBracket: boolean
  apiKeySet: boolean
  secretSet: boolean
}

type TradesResponse = {
  settings: PublicExchangeSettings
  orders: StoredTradeOrder[]
  openPosition: StoredTradeOrder | null
  realisedPnl24h: number
  symbol: string
}

const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none'
const labelClass = 'block text-xs uppercase tracking-wide text-subtle'

const STATUS_TONE: Record<string, string> = {
  placed: 'text-up',
  'dry-run': 'text-info',
  refused: 'text-warn',
  skipped: 'text-subtle',
  error: 'text-down',
}

/**
 * Automatic-trading configuration and audit trail.
 *
 * Credentials are write-only from the browser's point of view: the API returns
 * set/unset flags, and a secret only changes when you type a new value (or
 * press Clear). Every switch that could cause an order defaults to off.
 */
export function ExchangeSettingsCard() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const [data, setData] = useState<TradesResponse | null>(null)
  const [orders, setOrders] = useState<StoredTradeOrder[]>([])

  const [enabled, setEnabled] = useState(false)
  const [killSwitch, setKillSwitch] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [testnet, setTestnet] = useState(true)
  const [notionalUsd, setNotionalUsd] = useState('100')
  const [maxNotionalUsd, setMaxNotionalUsd] = useState('100')
  const [dailyLossLimitUsd, setDailyLossLimitUsd] = useState('50')
  const [maxDailyTrades, setMaxDailyTrades] = useState('5')
  const [useOcoBracket, setUseOcoBracket] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyTouched, setApiKeyTouched] = useState(false)
  const [apiKeySet, setApiKeySet] = useState(false)
  const [secret, setSecret] = useState('')
  const [secretTouched, setSecretTouched] = useState(false)
  const [secretSet, setSecretSet] = useState(false)

  const apply = useCallback((settings: PublicExchangeSettings, orderList: StoredTradeOrder[]) => {
    setEnabled(settings.enabled)
    setKillSwitch(settings.killSwitch)
    setDryRun(settings.dryRun)
    setTestnet(settings.testnet)
    setNotionalUsd(String(settings.notionalUsd))
    setMaxNotionalUsd(String(settings.maxNotionalUsd))
    setDailyLossLimitUsd(String(settings.dailyLossLimitUsd))
    setMaxDailyTrades(String(settings.maxDailyTrades ?? 5))
    setUseOcoBracket(settings.useOcoBracket ?? true)
    setApiKey('')
    setApiKeyTouched(false)
    setApiKeySet(settings.apiKeySet)
    setSecret('')
    setSecretTouched(false)
    setSecretSet(settings.secretSet)
    setOrders(orderList)
  }, [])

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/trades')
      const json = await readJson<TradesResponse>(response)
      setData(json)
      apply(json.settings, json.orders ?? [])
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Failed to load trading settings',
      })
    } finally {
      setLoading(false)
    }
  }, [apply])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/trades', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          enabled,
          dryRun,
          testnet,
          notionalUsd: Number(notionalUsd),
          maxNotionalUsd: Number(maxNotionalUsd),
          dailyLossLimitUsd: Number(dailyLossLimitUsd),
          maxDailyTrades: Number(maxDailyTrades),
          useOcoBracket,
          ...(apiKeyTouched ? { apiKey } : {}),
          ...(secretTouched ? { secret } : {}),
        }),
      })
      await readJson(response)
      await load()
      setStatus({ kind: 'ok', text: 'Trading settings saved' })
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Save failed',
      })
    } finally {
      setBusy(false)
    }
  }

  async function action(name: 'halt' | 'resume') {
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: name }),
      })
      const json = await readJson<{ message?: string }>(response)
      await load()
      setStatus({ kind: 'ok', text: json.message ?? 'Done' })
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'Action failed' })
    } finally {
      setBusy(false)
    }
  }

  const armed = enabled && !killSwitch

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Automatic trading (Binance)
          </h2>
          <p className="mt-1 text-xs text-subtle">
            Places market orders when the plan action changes. Off by default — arm it deliberately.
          </p>
        </div>
        <span
          className={
            'rounded-lg border px-3 py-1.5 text-xs font-medium ' +
            (!enabled
              ? 'border-line text-subtle'
              : killSwitch
                ? 'border-rose-500/40 bg-rose-500/10 text-down'
                : dryRun
                  ? 'border-amber-500/40 bg-amber-500/10 text-warn'
                  : testnet
                    ? 'border-sky-500/40 bg-sky-500/10 text-info'
                    : 'border-rose-500/40 bg-rose-500/10 text-down')
          }
        >
          {!enabled
            ? 'Off'
            : killSwitch
              ? 'Halted'
              : dryRun
                ? 'Dry run'
                : testnet
                  ? 'Testnet — live orders'
                  : 'Mainnet — LIVE MONEY'}
        </span>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-subtle">Loading…</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              Enable automatic trading
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(event) => setDryRun(event.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              Dry run (log only, never send)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={testnet}
                onChange={(event) => setTestnet(event.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              Use Binance Spot Testnet
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label>
              <span className={labelClass}>Order size (USD)</span>
              <input
                type="number"
                min={1}
                value={notionalUsd}
                onChange={(event) => setNotionalUsd(event.target.value)}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Max per order (USD)</span>
              <input
                type="number"
                min={1}
                value={maxNotionalUsd}
                onChange={(event) => setMaxNotionalUsd(event.target.value)}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Daily loss limit (USD)</span>
              <input
                type="number"
                min={0}
                value={dailyLossLimitUsd}
                onChange={(event) => setDailyLossLimitUsd(event.target.value)}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Max trades / 24h</span>
              <input
                type="number"
                min={1}
                max={50}
                value={maxDailyTrades}
                onChange={(event) => setMaxDailyTrades(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex items-center gap-2.5 sm:col-span-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={useOcoBracket}
                onChange={(event) => setUseOcoBracket(event.target.checked)}
                className="h-4 w-4 rounded border-line bg-surface-2 text-accent focus:ring-accent"
              />
              <span className="text-xs text-ink">
                <strong>Native Binance OCO Bracket Orders</strong> (Auto-attach SL & TP to Binance order book on BUY)
              </span>
            </label>

            <label className="sm:col-span-3">
              <span className={labelClass}>
                Binance API key {apiKeySet ? '· saved' : '· not set'} — trade only, no withdrawals
              </span>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value)
                    setApiKeyTouched(true)
                  }}
                  placeholder={apiKeySet ? '•••••••• (leave blank to keep)' : 'paste API key'}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    setApiKey('')
                    setApiKeyTouched(true)
                  }}
                  className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink"
                >
                  Clear
                </button>
              </div>
            </label>

            <label className="sm:col-span-3">
              <span className={labelClass}>Binance API secret {secretSet ? '· saved' : '· not set'}</span>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={secret}
                  onChange={(event) => {
                    setSecret(event.target.value)
                    setSecretTouched(true)
                  }}
                  placeholder={secretSet ? '•••••••• (leave blank to keep)' : 'paste API secret'}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSecret('')
                    setSecretTouched(true)
                  }}
                  className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink"
                >
                  Clear
                </button>
              </div>
            </label>
          </div>

          {data ? (
            <div className="mt-4 rounded-xl border border-line-soft bg-surface-2 p-3 text-xs text-muted">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span>
                  Realised P&L 24h:{' '}
                  <strong className={data.realisedPnl24h < 0 ? 'text-down' : 'text-up'}>
                    {data.realisedPnl24h >= 0 ? '+' : ''}
                    {data.realisedPnl24h.toFixed(2)} USD
                  </strong>
                </span>
                <span>
                  Open position:{' '}
                  <strong className="text-ink">
                    {data.openPosition
                      ? `${data.openPosition.quantity} @ ${formatPrice(data.openPosition.price)}`
                      : 'none'}
                  </strong>
                </span>
                <span>
                  Guards: <strong className="text-ink">kill switch, hard cap, daily loss limit</strong>
                </span>
              </div>
            </div>
          ) : null}

          {status ? (
            <p
              className={
                'mt-3 rounded-lg border px-3 py-2 text-sm ' +
                (status.kind === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-up'
                  : 'border-rose-500/30 bg-rose-500/10 text-down')
              }
            >
              {status.text}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            {enabled ? (
              <button
                type="button"
                onClick={() => void action(killSwitch ? 'resume' : 'halt')}
                disabled={busy}
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-down transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                {killSwitch ? 'Release kill switch' : 'Engage kill switch'}
              </button>
            ) : null}
          </div>

          {orders.length > 0 ? (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wide text-subtle">Recent order attempts</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left uppercase tracking-wide text-subtle">
                      <th className="py-1.5 pr-4 font-medium">When</th>
                      <th className="py-1.5 pr-4 font-medium">Side</th>
                      <th className="py-1.5 pr-4 text-right font-medium">Qty</th>
                      <th className="py-1.5 pr-4 text-right font-medium">Price</th>
                      <th className="py-1.5 pr-4 text-right font-medium">Notional</th>
                      <th className="py-1.5 pr-4 font-medium">Status</th>
                      <th className="py-1.5 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {orders.slice(0, 8).map((order) => (
                      <tr key={order.id} className="text-muted">
                        <td className="py-1.5 pr-4 whitespace-nowrap text-subtle">
                          {new Date(order.createdAt).toLocaleTimeString('en-US', { hour12: false })}
                        </td>
                        <td className="py-1.5 pr-4">{order.side}</td>
                        <td className="py-1.5 pr-4 text-right">{order.quantity || '—'}</td>
                        <td className="py-1.5 pr-4 text-right">{formatPrice(order.price)}</td>
                        <td className="py-1.5 pr-4 text-right">
                          {order.notionalUsd ? `$${order.notionalUsd.toFixed(2)}` : '—'}
                        </td>
                        <td
                          className={`py-1.5 pr-4 font-medium ${STATUS_TONE[order.status] ?? 'text-muted'}`}
                        >
                          {order.status}
                        </td>
                        <td className="py-1.5 text-subtle">{order.reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <p className="mt-5 text-xs text-subtle">
            Guard order: kill switch → enabled → credentials → hard cap → daily loss limit →
            withdrawal-permission check → balance. Any refusal is written to the audit log above, so
            nothing is silent. A dry run never sends an order.
          </p>
        </>
      )}
    </section>
  )
}
