'use client'

import { useCallback, useEffect, useState } from 'react'
import { readJson } from '@/lib/utils'

type PublicExchangeSettings = {
  enabled: boolean
  killSwitch: boolean
  dryRun: boolean
  testnet: boolean
  notionalUsd: number
  maxNotionalUsd: number
  dailyLossLimitUsd: number
  apiKeySet: boolean
  secretSet: boolean
}

/**
 * Always-visible trading state for the dashboard header.
 *
 * The whole point is that you cannot be running live orders without seeing it —
 * and the kill switch is one click away from the page you actually look at.
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
      // Not fatal — the badge simply does not render.
      setSettings(null)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function halt(action: 'halt' | 'resume') {
    setBusy(true)
    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await readJson(response)
      await load()
    } catch {
      // Leave the badge as-is; the settings page reports the error in detail.
    } finally {
      setBusy(false)
    }
  }

  // Render nothing at all when trading is off — no clutter for the default setup.
  if (!settings || !settings.enabled) return null

  const label = settings.killSwitch
    ? 'Halted'
    : settings.dryRun
      ? 'Dry run'
      : settings.testnet
        ? 'Testnet'
        : 'LIVE'

  const tone = settings.killSwitch
    ? 'border-line text-subtle'
    : settings.dryRun
      ? 'border-amber-500/40 bg-amber-500/10 text-warn'
      : settings.testnet
        ? 'border-sky-500/40 bg-sky-500/10 text-info'
        : 'border-rose-500/40 bg-rose-500/10 text-down'

  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-lg border px-3 py-2 text-xs font-medium ${tone}`}
        title={`Order $${settings.notionalUsd} · cap $${settings.maxNotionalUsd} · daily loss limit $${settings.dailyLossLimitUsd}`}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={() => void halt(settings.killSwitch ? 'resume' : 'halt')}
        disabled={busy}
        className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-down transition hover:bg-rose-500/20 disabled:opacity-50"
      >
        {settings.killSwitch ? 'Resume' : 'Halt'}
      </button>
    </div>
  )
}
