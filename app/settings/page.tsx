'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ExchangeSettingsCard } from '@/components/ExchangeSettingsCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { readJson } from '@/lib/utils'

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
}

type Channel = 'email' | 'telegram'
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
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<{ channel: Channel; action: 'save' | 'test' } | null>(null)
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
            : {
                telegram: {
                  enabled: tgEnabled,
                  mode: tgMode,
                  chatId: tgChatId,
                  ...(tgTokenTouched ? { botToken: tgToken } : {}),
                },
              }

        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await readJson<{ settings: PublicSettings }>(response)

        apply(json.settings)
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
    return (
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save(channel)}
          disabled={isBusy}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {isBusy && busy?.action === 'save' ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => void test(channel)}
          disabled={isBusy}
          className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
        >
          {isBusy && busy?.action === 'test' ? 'Sending…' : 'Send test'}
        </button>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notification settings</h1>
          <p className="mt-1 text-sm text-muted">
            Configure when and where alerts are sent. Both channels are independent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="mt-8 text-sm text-subtle">Loading…</p>
      ) : (
        <div className="mt-6 space-y-6">
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
                    onClick={() => {
                      setEmailKey('')
                      setEmailKeyTouched(true)
                    }}
                    className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink"
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
                    onClick={() => {
                      setTgToken('')
                      setTgTokenTouched(true)
                    }}
                    className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    Clear
                  </button>
                </div>
              </label>
            </div>

            {channelStatus('telegram')}
            {actions('telegram')}
          </section>

          {/* ---- Automatic trading ---- */}
          <ExchangeSettingsCard />

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
