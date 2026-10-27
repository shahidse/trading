'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '@/lib/format'
import type { StoredTradeOrder } from '@/lib/db/schema'
import { readJson } from '@/lib/utils'
import { ExchangeSettingsSkeleton, ButtonSpinner } from '@/components/Loader'

import { SUPPORTED_EXCHANGES, type SupportedExchangeId } from '@/lib/exchange/broker'

type PublicExchangeSettings = {
  exchangeId?: SupportedExchangeId
  enabled: boolean
  killSwitch: boolean
  dryRun: boolean
  testnet: boolean
  notionalUsd: number
  maxNotionalUsd: number
  dailyLossLimitUsd: number
  maxDailyTrades: number
  useOcoBracket: boolean
  reversalScalpMode: boolean
  apiKeySet: boolean
  secretSet: boolean
  passwordSet?: boolean
  brokerId?: string
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
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const [data, setData] = useState<TradesResponse | null>(null)

  const [exchangeId, setExchangeId] = useState<SupportedExchangeId>('binance')
  const [enabled, setEnabled] = useState(false)
  const [killSwitch, setKillSwitch] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [testnet, setTestnet] = useState(true)
  const [notionalUsd, setNotionalUsd] = useState('100')
  const [maxNotionalUsd, setMaxNotionalUsd] = useState('100')
  const [dailyLossLimitUsd, setDailyLossLimitUsd] = useState('50')
  const [maxDailyTrades, setMaxDailyTrades] = useState('5')
  const [useOcoBracket, setUseOcoBracket] = useState(true)
  const [reversalScalpMode, setReversalScalpMode] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyTouched, setApiKeyTouched] = useState(false)
  const [apiKeySet, setApiKeySet] = useState(false)
  const [secret, setSecret] = useState('')
  const [secretTouched, setSecretTouched] = useState(false)
  const [secretSet, setSecretSet] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [passwordSet, setPasswordSet] = useState(false)
  const [brokerId, setBrokerId] = useState('x-ETHBOT')
  const [brokerIdTouched, setBrokerIdTouched] = useState(false)

  const apply = useCallback((settings: PublicExchangeSettings) => {
    setExchangeId(settings.exchangeId ?? 'binance')
    setEnabled(settings.enabled)
    setKillSwitch(settings.killSwitch)
    setDryRun(settings.dryRun)
    setTestnet(settings.testnet)
    setNotionalUsd(String(settings.notionalUsd))
    setMaxNotionalUsd(String(settings.maxNotionalUsd))
    setDailyLossLimitUsd(String(settings.dailyLossLimitUsd))
    setMaxDailyTrades(String(settings.maxDailyTrades ?? 5))
    setUseOcoBracket(settings.useOcoBracket ?? true)
    setReversalScalpMode(settings.reversalScalpMode ?? false)
    setApiKey('')
    setApiKeyTouched(false)
    setApiKeySet(settings.apiKeySet)
    setSecret('')
    setSecretTouched(false)
    setSecretSet(settings.secretSet)
    setPassword('')
    setPasswordTouched(false)
    setPasswordSet(Boolean(settings.passwordSet))
    setBrokerId(settings.brokerId ?? 'x-ETHBOT')
    setBrokerIdTouched(false)
  }, [])

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/trades')
      const json = await readJson<TradesResponse>(response)
      setData(json)
      apply(json.settings)
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
          exchangeId,
          enabled,
          dryRun,
          testnet,
          notionalUsd: Number(notionalUsd),
          maxNotionalUsd: Number(maxNotionalUsd),
          dailyLossLimitUsd: Number(dailyLossLimitUsd),
          maxDailyTrades: Number(maxDailyTrades),
          useOcoBracket,
          reversalScalpMode,
          ...(apiKeyTouched ? { apiKey } : {}),
          ...(secretTouched ? { secret } : {}),
          ...(passwordTouched ? { password } : {}),
          ...(brokerIdTouched ? { brokerId } : {}),
        }),
      })
      await readJson(response)
      await load()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
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
            Automatic Spot Trading ({SUPPORTED_EXCHANGES.find((e) => e.id === exchangeId)?.name ?? 'Binance'})
          </h2>
          <p className="mt-1 text-xs text-subtle">
            Select your preferred spot exchange and connect read/trade API credentials.
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
        <ExchangeSettingsSkeleton />
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

            <label className="flex items-start gap-3 sm:col-span-3 rounded-2xl border border-line-soft bg-surface-2/70 p-4 cursor-pointer transition hover:bg-surface-2">
              <input
                type="checkbox"
                checked={reversalScalpMode}
                onChange={(event) => setReversalScalpMode(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line bg-surface text-accent focus:ring-accent"
              />
              <div>
                <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Reversal Scalping Mode (Earn Daily from Bullish Candle Bounces)</span>
                </p>
                <p className="mt-1 text-xs text-subtle leading-relaxed">
                  When enabled, the engine will NOT sit out on strong bullish candlestick patterns (Bullish Engulfing, Hammer, Morning Star, Three White Soldiers) or oversold RSI bounces even when the macro trend is downward. Executes scalp orders with tight protective stop (~0.8%) and quick profit target (~1.2%) so you can profit from intraday candle fluctuations.
                </p>
              </div>
            </label>

            {/* Multi-Exchange Selector Dropdown / Cards */}
            <div className="sm:col-span-3 mt-2">
              <span className={labelClass}>Target Spot Exchange</span>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SUPPORTED_EXCHANGES.map((ex) => {
                  const active = exchangeId === ex.id
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setExchangeId(ex.id)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                        active
                          ? 'border-accent bg-accent/10 ring-1 ring-accent'
                          : 'border-line bg-surface-2/40 hover:bg-surface-2 hover:border-line-soft'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-lg">{ex.logo}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            active ? 'bg-accent text-white' : 'bg-surface-2 text-subtle'
                          }`}
                        >
                          {ex.badge}
                        </span>
                      </div>
                      <span className="mt-1.5 text-xs font-bold text-ink">{ex.name}</span>
                      <span className="text-[10px] text-muted">Maker {ex.makerFee} · Taker {ex.takerFee}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="sm:col-span-3">
              <span className={labelClass}>
                {SUPPORTED_EXCHANGES.find((e) => e.id === exchangeId)?.name ?? 'Exchange'} API key{' '}
                {apiKeySet ? '· saved' : '· not set'} — trade only, no withdrawals
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
                  disabled={busy || (!apiKey && !apiKeySet)}
                  onClick={() => {
                    setApiKey('')
                    setApiKeyTouched(true)
                  }}
                  className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </label>

            <label className="sm:col-span-3">
              <span className={labelClass}>
                {SUPPORTED_EXCHANGES.find((e) => e.id === exchangeId)?.name ?? 'Exchange'} API secret{' '}
                {secretSet ? '· saved' : '· not set'}
              </span>
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
                  disabled={busy || (!secret && !secretSet)}
                  onClick={() => {
                    setSecret('')
                    setSecretTouched(true)
                  }}
                  className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </label>

            {/* Passphrase for OKX / Bitget */}
            {(exchangeId === 'okx' || exchangeId === 'bitget') && (
              <label className="sm:col-span-3">
                <span className={labelClass}>
                  {exchangeId.toUpperCase()} API Passphrase {passwordSet ? '· saved' : '· required'}
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setPasswordTouched(true)
                    }}
                    placeholder={passwordSet ? '•••••••• (leave blank to keep)' : 'enter API passphrase'}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={busy || (!password && !passwordSet)}
                    onClick={() => {
                      setPassword('')
                      setPasswordTouched(true)
                    }}
                    className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </label>
            )}

            {/* Broker & Fee Rebate Tagging (30%-40% Automated Fee Rebates) */}
            <div className="sm:col-span-3 rounded-xl border border-line bg-surface-2/40 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>💰</span>
                    <span>Broker & Referral Fee Rebate Tag</span>
                  </span>
                  <p className="mt-0.5 text-[11px] text-subtle">
                    Orders sent through this software include your broker partner tag to earn 30%–40% automated exchange fee rebates.
                  </p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-up/10 text-up border border-up/30">
                  Fee Rebates Active
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="text"
                  value={brokerId}
                  onChange={(event) => {
                    setBrokerId(event.target.value)
                    setBrokerIdTouched(true)
                  }}
                  placeholder="e.g. x-ETHBOT or your referral code"
                  className={inputClass}
                />
              </div>
            </div>
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
                      ? `${data.openPosition.side} ${data.openPosition.quantity} @ ${formatPrice(data.openPosition.price)}`
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
            {(() => {
              const notionalNum = Number(notionalUsd)
              const maxNotionalNum = Number(maxNotionalUsd)
              const isInvalidNotional =
                Number.isNaN(notionalNum) ||
                notionalNum <= 0 ||
                Number.isNaN(maxNotionalNum) ||
                maxNotionalNum <= 0 ||
                notionalNum > maxNotionalNum

              return (
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy || isInvalidNotional}
                  title={
                    notionalNum > maxNotionalNum
                      ? 'Order size cannot exceed max per order'
                      : notionalNum <= 0
                      ? 'Order size must be positive'
                      : 'Save trading settings'
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    saved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-500 hover:bg-indigo-400'
                  }`}
                >
                  {busy ? (
                    <ButtonSpinner label="Saving settings…" size="xs" />
                  ) : saved ? (
                    <>
                      <span>✓</span>
                      <span>Saved!</span>
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              )
            })()}
            {enabled ? (
              <button
                type="button"
                onClick={() => void action(killSwitch ? 'resume' : 'halt')}
                disabled={busy}
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-down transition hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {busy ? (
                  <ButtonSpinner label={killSwitch ? 'Releasing kill switch…' : 'Engaging kill switch…'} size="xs" />
                ) : killSwitch ? (
                  'Release kill switch'
                ) : (
                  'Engage kill switch'
                )}
              </button>
            ) : null}
          </div>

          <p className="mt-5 text-xs text-subtle">
            Guard order: kill switch → enabled → credentials → hard cap → daily loss limit →
            withdrawal-permission check → balance. Any refusal is recorded to the execution log on the
            dashboard, so nothing is silent. A dry run never sends real orders to Binance.
          </p>
        </>
      )}
    </section>
  )
}
