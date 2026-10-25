'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ExchangeSettingsCard } from '@/components/ExchangeSettingsCard'
import { HotCoinsAutoTradeCard } from '@/components/HotCoinsAutoTradeCard'
import { VenueSelector } from '@/components/VenueSelector'
import { ThemeToggle, useTheme, ThemeStyleGrid } from '@/components/ThemeToggle'
import { LAYOUT_OPTIONS, LIGHT_MODES, type LayoutType } from '@/lib/theme'
import { readJson } from '@/lib/utils'
import { SettingsSkeleton, ButtonSpinner } from '@/components/Loader'

/** Interactive layout selection card */
function LayoutCardItem({
  item,
}: {
  item: (typeof LAYOUT_OPTIONS)[number]
}) {
  const { layoutType, setLayoutType } = useTheme()
  const active = layoutType === item.id

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setLayoutType(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setLayoutType(item.id)
        }
      }}
      className={`group cursor-pointer rounded-2xl border p-4 text-xs transition-all relative flex flex-col justify-between ${
        active
          ? 'border-accent bg-accent/5 shadow-md ring-2 ring-accent/30'
          : 'border-line bg-surface hover:border-line-soft hover:bg-surface-2/60 hover:shadow-xs'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl p-1.5 rounded-xl bg-surface-2 border border-line-soft">{item.icon}</span>
            <div>
              <span className="font-bold text-sm text-ink group-hover:text-accent transition">
                {item.label}
              </span>
              <span
                className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  active ? 'bg-accent text-white' : 'bg-surface-2 text-subtle'
                }`}
              >
                {active ? 'Active' : 'Select'}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-subtle leading-relaxed font-medium">
          {item.uxFocus}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-line-soft space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-subtle font-medium">Data Density</span>
          <span className="font-semibold text-ink">{item.density}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-subtle font-medium">Mobile Adaptation</span>
          <span className="font-semibold text-accent sm:text-ink text-left sm:text-right" title={item.mobileAdaptability}>
            {item.mobileAdaptability}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Notification settings — trigger mode, recipients and credentials for the
 * email and Telegram channels.
 *
 * Saved keys are never sent back to the browser: the secret inputs start blank
 * with a "saved" placeholder and only overwrite the stored value when you type
 * a new one (or clear it explicitly).
 */

type NotifyMode = 'action-change' | 'direction-change' | 'every'

type PublicSettings = {
  email: { enabled: boolean; mode: NotifyMode; from: string; to: string; apiKeySet: boolean }
  telegram: { enabled: boolean; mode: NotifyMode; chatId: string; botTokenSet: boolean }
  square?: {
    enabled: boolean
    mode: NotifyMode
    apiKeySet: boolean
    allowedTokens?: string[]
    maxDailyPostsPerToken?: number
  }
}

type Channel = 'email' | 'telegram' | 'square'
type Status = { channel: Channel; kind: 'ok' | 'error'; text: string }

const MODE_OPTIONS: { value: NotifyMode; label: string }[] = [
  { value: 'action-change', label: 'Action change — BUY/SELL/STAY_OUT flips (recommended)' },
  { value: 'direction-change', label: 'Direction change — LONG/SHORT/NEUTRAL flips' },
  { value: 'every', label: 'Every analysis — once per run, no dedupe' },
]

const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none'
const labelClass = 'block text-xs uppercase tracking-wide text-subtle'

export default function SettingsPage() {
  const { colorMode, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<{ channel: Channel; action: 'save' | 'test' } | null>(null)
  const [savedChannel, setSavedChannel] = useState<Channel | null>(null)
  const [status, setStatus] = useState<Status | null>(null)

  const [emailEnabled, setEmailEnabled] = useState(false)
  const [emailMode, setEmailMode] = useState<NotifyMode>('action-change')
  const [emailFrom, setEmailFrom] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [emailKey, setEmailKey] = useState('')
  const [emailKeyTouched, setEmailKeyTouched] = useState(false)
  const [emailKeySet, setEmailKeySet] = useState(false)

  const [tgEnabled, setTgEnabled] = useState(false)
  const [tgMode, setTgMode] = useState<NotifyMode>('action-change')
  const [tgChatId, setTgChatId] = useState('')
  const [tgToken, setTgToken] = useState('')
  const [tgTokenTouched, setTgTokenTouched] = useState(false)
  const [tgTokenSet, setTgTokenSet] = useState(false)

  const [squareEnabled, setSquareEnabled] = useState(false)
  const [squareMode, setSquareMode] = useState<NotifyMode>('action-change')
  const [squareTokens, setSquareTokens] = useState('ETH,BTC,SOL')
  const [squareMaxPosts, setSquareMaxPosts] = useState(2)
  const [squareKey, setSquareKey] = useState('')
  const [squareKeyTouched, setSquareKeyTouched] = useState(false)
  const [squareKeySet, setSquareKeySet] = useState(false)

  const apply = useCallback((settings: PublicSettings) => {
    setEmailEnabled(settings.email.enabled)
    setEmailMode(settings.email.mode)
    setEmailFrom(settings.email.from)
    setEmailTo(settings.email.to)
    setEmailKey('')
    setEmailKeyTouched(false)
    setEmailKeySet(settings.email.apiKeySet)

    setTgEnabled(settings.telegram.enabled)
    setTgMode(settings.telegram.mode)
    setTgChatId(settings.telegram.chatId)
    setTgToken('')
    setTgTokenTouched(false)
    setTgTokenSet(settings.telegram.botTokenSet)

    if (settings.square) {
      setSquareEnabled(settings.square.enabled)
      setSquareMode(settings.square.mode)
      setSquareTokens(settings.square.allowedTokens?.join(', ') ?? 'ETH,BTC,SOL')
      setSquareMaxPosts(settings.square.maxDailyPostsPerToken ?? 2)
      setSquareKey('')
      setSquareKeyTouched(false)
      setSquareKeySet(settings.square.apiKeySet)
    }
  }, [])

  useEffect(() => {
    fetch('/api/settings')
      .then((response) => readJson<{ settings: PublicSettings }>(response))
      .then((json) => {
        apply(json.settings)
      })
      .catch((error: unknown) => {
        setStatus({
          channel: 'email',
          kind: 'error',
          text: error instanceof Error ? error.message : 'Failed to load settings',
        })
      })
      .finally(() => setLoading(false))
  }, [apply])

  const save = useCallback(
    async (channel: Channel) => {
      setBusy({ channel, action: 'save' })
      setStatus(null)
      try {
        const body =
          channel === 'email'
            ? {
                email: {
                  enabled: emailEnabled,
                  mode: emailMode,
                  from: emailFrom,
                  to: emailTo,
                  ...(emailKeyTouched ? { apiKey: emailKey } : {}),
                },
              }
            : channel === 'telegram'
            ? {
                telegram: {
                  enabled: tgEnabled,
                  mode: tgMode,
                  chatId: tgChatId,
                  ...(tgTokenTouched ? { botToken: tgToken } : {}),
                },
              }
            : {
                square: {
                  enabled: squareEnabled,
                  mode: squareMode,
                  allowedTokens: squareTokens.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
                  maxDailyPostsPerToken: Math.max(1, Number(squareMaxPosts) || 2),
                  ...(squareKeyTouched ? { apiKey: squareKey } : {}),
                },
              }

        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await readJson<{ settings: PublicSettings }>(response)

        apply(json.settings)
        setSavedChannel(channel)
        setTimeout(() => setSavedChannel(null), 2500)
        setStatus({ channel, kind: 'ok', text: 'Settings saved' })
      } catch (error) {
        setStatus({
          channel,
          kind: 'error',
          text: error instanceof Error ? error.message : 'Save failed',
        })
      } finally {
        setBusy(null)
      }
    },
    [
      apply,
      emailEnabled,
      emailMode,
      emailFrom,
      emailTo,
      emailKey,
      emailKeyTouched,
      tgEnabled,
      tgMode,
      tgChatId,
      tgToken,
      tgTokenTouched,
      squareEnabled,
      squareMode,
      squareKey,
      squareKeyTouched,
    ],
  )

  const test = useCallback(async (channel: Channel) => {
    setBusy({ channel, action: 'test' })
    setStatus(null)
    try {
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const json = await readJson<{ message?: string }>(response)
      setStatus({ channel, kind: 'ok', text: json.message ?? 'Test sent' })
    } catch (error) {
      setStatus({
        channel,
        kind: 'error',
        text: error instanceof Error ? error.message : 'Test failed',
      })
    } finally {
      setBusy(null)
    }
  }, [])

  function channelStatus(channel: Channel) {
    if (!status || status.channel !== channel) return null
    const tone =
      status.kind === 'ok'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-up'
        : 'border-rose-500/30 bg-rose-500/10 text-down'
    return <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${tone}`}>{status.text}</p>
  }

  function actions(channel: Channel) {
    const isBusy = busy?.channel === channel
    const isAnyBusy = busy !== null
    const isSaved = savedChannel === channel

    let canTest = false
    let testTooltip = ''

    if (channel === 'email') {
      const hasKey = emailKeySet || emailKey.trim().length > 0
      const hasRecipient = emailTo.trim().length > 0
      canTest = hasKey && hasRecipient
      testTooltip = !hasKey
        ? 'Resend API key is required to send a test'
        : !hasRecipient
        ? 'Recipient email is required to send a test'
        : 'Send a test email using current configuration'
    } else if (channel === 'telegram') {
      const hasToken = tgTokenSet || tgToken.trim().length > 0
      const hasChat = tgChatId.trim().length > 0
      canTest = hasToken && hasChat
      testTooltip = !hasToken
        ? 'Telegram bot token is required to send a test'
        : !hasChat
        ? 'Telegram Chat ID is required to send a test'
        : 'Send a test Telegram message using current configuration'
    } else {
      const hasKey = squareKeySet || squareKey.trim().length > 0
      canTest = hasKey
      testTooltip = hasKey ? 'Test Binance Square webhook' : 'Creator API key is required'
    }

    return (
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save(channel)}
          disabled={isAnyBusy}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
            isSaved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-500 hover:bg-indigo-400'
          }`}
        >
          {isBusy && busy?.action === 'save' ? (
            <ButtonSpinner label="Saving…" size="xs" />
          ) : isSaved ? (
            <>
              <span>✓</span>
              <span>Saved!</span>
            </>
          ) : (
            'Save'
          )}
        </button>
        <button
          type="button"
          onClick={() => void test(channel)}
          disabled={isAnyBusy || !canTest}
          title={testTooltip}
          className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isBusy && busy?.action === 'test' ? (
            <ButtonSpinner label="Sending test…" size="xs" />
          ) : (
            'Send test'
          )}
        </button>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">App & Notification Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Configure layout mode, visual design archetype, automated trading, and alert channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <div className="mt-6 space-y-6">
          {/* ---- Workspace Layout Architecture ---- */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                  Workspace Layout Architecture
                </h2>
                <p className="mt-1 text-xs text-subtle">
                  Select your optimal layout paradigm. Changing this reorganizes your live trading cockpit across all devices.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LAYOUT_OPTIONS.map((item) => {
                return (
                  <LayoutCardItem key={item.id} item={item} />
                )
              })}
            </div>
          </section>

          {/* ---- Color Themes & Ambient Room Lighting ---- */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-6">
            <div>
              <div className="mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Color Themes & Visual Palettes (8)
                </h2>
                <p className="mt-1 text-xs text-subtle">
                  Curated aesthetic design systems tailored for professional quant traders, crypto hedge funds, and night-owls.
                </p>
              </div>
              <ThemeStyleGrid />
            </div>

            <div className="border-t border-line-soft pt-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Ambient Room Lighting Setup
                </h3>
                <p className="mt-1 text-xs text-subtle">
                  Adjust interface illumination to match your real-world room lighting: from full daylight sun to OLED pitch darkness.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {LIGHT_MODES.map((mode) => {
                  const active = colorMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTheme(mode.id)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                        active
                          ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent'
                          : 'border-line bg-surface-2 hover:border-line-soft'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-lg">{mode.icon}</span>
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20 dark:border-white/20"
                          style={{ backgroundColor: mode.bgPreview }}
                        />
                      </div>
                      <span className="text-xs font-bold text-ink">{mode.label}</span>
                      <span className="text-[10px] text-accent font-medium mt-0.5">{mode.ambientTitle}</span>
                      <p className="text-[10px] text-subtle mt-1 line-clamp-2">{mode.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ---- Email ---- */}
          <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Email (Resend)
              </h2>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(event) => setEmailEnabled(event.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={labelClass}>Trigger</span>
                <select
                  value={emailMode}
                  onChange={(event) => setEmailMode(event.target.value as NotifyMode)}
                  className={inputClass}
                >
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>From</span>
                <input
                  value={emailFrom}
                  onChange={(event) => setEmailFrom(event.target.value)}
                  placeholder="onboarding@resend.dev"
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>To (comma-separated)</span>
                <input
                  value={emailTo}
                  onChange={(event) => setEmailTo(event.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </label>

              <label className="sm:col-span-2">
                <span className={labelClass}>
                  Resend API key {emailKeySet ? '· saved' : '· not set'}
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={emailKey}
                    onChange={(event) => {
                      setEmailKey(event.target.value)
                      setEmailKeyTouched(true)
                    }}
                    placeholder={emailKeySet ? '•••••••• (leave blank to keep)' : 're_…'}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={Boolean(busy) || (!emailKey && !emailKeySet)}
                    onClick={() => {
                      setEmailKey('')
                      setEmailKeyTouched(true)
                    }}
                    className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </label>
            </div>

            {channelStatus('email')}
            {actions('email')}
          </section>

          {/* ---- Telegram ---- */}
          <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Telegram
              </h2>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={tgEnabled}
                  onChange={(event) => setTgEnabled(event.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={labelClass}>Trigger</span>
                <select
                  value={tgMode}
                  onChange={(event) => setTgMode(event.target.value as NotifyMode)}
                  className={inputClass}
                >
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className={labelClass}>Chat ID</span>
                <input
                  value={tgChatId}
                  onChange={(event) => setTgChatId(event.target.value)}
                  placeholder="123456789"
                  className={inputClass}
                />
              </label>

              <label className="sm:col-span-2">
                <span className={labelClass}>
                  Bot token {tgTokenSet ? '· saved' : '· not set'}
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={tgToken}
                    onChange={(event) => {
                      setTgToken(event.target.value)
                      setTgTokenTouched(true)
                    }}
                    placeholder={tgTokenSet ? '•••••••• (leave blank to keep)' : '123456:ABC-DEF…'}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={Boolean(busy) || (!tgToken && !tgTokenSet)}
                    onClick={() => {
                      setTgToken('')
                      setTgTokenTouched(true)
                    }}
                    className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </label>
            </div>

            {channelStatus('telegram')}
            {actions('telegram')}
          </section>

          {/* ---- Binance Square Social Feed ---- */}
          <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-sm text-amber-500 font-bold">
                  🟡
                </span>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">
                    Binance Square (Social Feed)
                  </h2>
                  <p className="text-xs text-subtle">
                    Auto-publish signals and predictions to your Binance Square creator profile
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={squareEnabled}
                  onChange={(event) => setSquareEnabled(event.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Auto-Publish Trigger</span>
                <select
                  value={squareMode}
                  onChange={(event) => setSquareMode(event.target.value as NotifyMode)}
                  className={inputClass}
                >
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Max Daily Posts Per Token</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={squareMaxPosts}
                  onChange={(event) => setSquareMaxPosts(Math.max(1, parseInt(event.target.value, 10) || 1))}
                  placeholder="2"
                  className={inputClass}
                />
                <span className="mt-1 block text-[11px] text-subtle">
                  Maximum automatic posts per token per 24h UTC window (anti-spam quota).
                </span>
              </label>

              <label className="sm:col-span-2">
                <span className={labelClass}>Allowed Tokens for Auto-Posting</span>
                <input
                  type="text"
                  value={squareTokens}
                  onChange={(event) => setSquareTokens(event.target.value)}
                  placeholder="e.g. ETH, BTC, SOL (or * for all)"
                  className={inputClass}
                />
                <span className="mt-1 block text-[11px] text-subtle">
                  Only signals for these coins are auto-published to Square. Comma-separated or * for all.
                </span>
              </label>

              <label className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className={labelClass}>
                    Binance Square Creator OpenAPI Key {squareKeySet ? '· saved' : '· not set'}
                  </span>
                  <a
                    href="https://square.binance.com/creator-center"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-accent hover:underline"
                  >
                    Get Key from Creator Center ↗
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={squareKey}
                    onChange={(event) => {
                      setSquareKey(event.target.value)
                      setSquareKeyTouched(true)
                    }}
                    placeholder={squareKeySet ? '•••••••• (leave blank to keep)' : 'Enter Square OpenAPI Key…'}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={Boolean(busy) || (!squareKey && !squareKeySet)}
                    onClick={() => {
                      setSquareKey('')
                      setSquareKeyTouched(true)
                    }}
                    className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </label>
            </div>

            {channelStatus('square')}
            {actions('square')}
          </section>

          {/* ---- Execution Venue Selection ---- */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                  Active Execution Venue
                </h2>
                <p className="mt-1 text-xs text-subtle">
                  Choose between Binance Spot (Default CEX), Hyperliquid L1 DEX (Agent Wallet, zero API keys), or Solana DEX (Phantom + Jupiter Aggregator).
                </p>
              </div>
            </div>
            <div className="mt-4">
              <VenueSelector />
            </div>
          </section>

          {/* ---- Automatic trading ---- */}
          <ExchangeSettingsCard />

          {/* ---- Hot Coins Automated Execution Engine ---- */}
          <HotCoinsAutoTradeCard />

          <p className="text-xs text-subtle">
            Settings are stored in the local SQLite database and take effect immediately for the
            dashboard, the CLI (<code className="text-muted">npm run analyze</code>) and the
            scheduler. Values saved here override <code className="text-muted">.env.local</code>
            . Find your Telegram chat id by messaging the bot, then reading{' '}
            <code className="text-muted">api.telegram.org/bot&lt;token&gt;/getUpdates</code>.
          </p>
        </div>
      )}
    </main>
  )
}
