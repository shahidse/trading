'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
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

/**
 * Always-visible trading state and quick actions for the dashboard header.
 * Shows current mode (Dry Run, Testnet, Live, or Off) with instant Arm/Halt controls.
 */
export function TradingControls() {
  const [settings, setSettings] = useState<PublicExchangeSettings | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/trades')
      const json = await readJson<{ settings: PublicExchangeSettings }>(response)
      setSettings(json.settings)
    } catch {
      // Not fatal — the badge simply does not render while loading
      setSettings(null)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function postAction(action: 'halt' | 'resume' | 'arm' | 'disarm') {
    setBusy(true)
    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await readJson(response)
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (!settings) return null

  const label = !settings.enabled
    ? 'Trading: Off'
    : settings.killSwitch
      ? 'Halted'
      : settings.dryRun
        ? 'Dry run'
        : settings.testnet
          ? 'Testnet'
          : 'LIVE'

  const tone = !settings.enabled
    ? 'border-line text-subtle hover:text-ink'
    : settings.killSwitch
      ? 'border-rose-500/40 bg-rose-500/10 text-down'
      : settings.dryRun
        ? 'border-amber-500/40 bg-amber-500/10 text-warn'
        : settings.testnet
          ? 'border-sky-500/40 bg-sky-500/10 text-info'
          : 'border-rose-500/40 bg-rose-500/10 text-down font-bold'

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/settings"
        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${tone}`}
        title={`Status: ${label} · Click to open Trading & Alert Settings`}
      >
        {label}
      </Link>

      {!settings.enabled ? (
        <button
          type="button"
          onClick={() => void postAction('arm')}
          disabled={busy}
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-warn transition hover:bg-amber-500/20 disabled:opacity-50"
          title="Enable automated trading in safe Dry Run mode"
        >
          {busy ? '…' : 'Arm Dry Run'}
        </button>
      ) : settings.killSwitch ? (
        <button
          type="button"
          onClick={() => void postAction('resume')}
          disabled={busy}
          className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition hover:bg-surface-2 disabled:opacity-50"
        >
          {busy ? '…' : 'Resume'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void postAction('halt')}
          disabled={busy}
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-down transition hover:bg-rose-500/20 disabled:opacity-50"
          title="Emergency Stop — halts automatic order placement"
        >
          {busy ? '…' : 'Halt'}
        </button>
      )}
    </div>
  )
}
