'use client'

import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

type FastConnectStatus = {
  apiKeySet: boolean
  secretSet: boolean
  credentialSource: 'env' | 'fast-connect' | 'none'
  hasEnvCredentials: boolean
  fastConnectUrl?: string
  appName?: string
  permissions?: string[]
  withdrawalsDisabled?: boolean
}

export function BinanceFastConnectModal({ open, onClose }: Props) {
  const [status, setStatus] = useState<FastConnectStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  // Direct manual pairing fields (when connecting without env)
  const [inputKey, setInputKey] = useState('')
  const [inputSecret, setInputSecret] = useState('')
  const [isTestnet, setIsTestnet] = useState(true)

  const fetchStatus = () => {
    setLoading(true)
    fetch('/api/auth/binance/fast-connect')
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch((err) => console.error('Failed to load Fast Connect status:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) {
      fetchStatus()
      setMessage(null)
    }
  }, [open])

  if (!open) return null

  const handlePairFastConnect = async () => {
    if (!inputKey || !inputSecret) {
      setMessage({ kind: 'error', text: 'Please enter both API Key and Secret' })
      return
    }

    setConnecting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/auth/binance/fast-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: inputKey.trim(),
          secret: inputSecret.trim(),
          testnet: isTestnet,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fast Connect failed')

      setMessage({ kind: 'ok', text: data.message ?? 'Connected successfully!' })
      setInputKey('')
      setInputSecret('')
      fetchStatus()
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setConnecting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/binance/fast-connect', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Disconnect failed')
      setMessage({ kind: 'ok', text: 'Fast Connect credentials cleared.' })
      fetchStatus()
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-yellow-500/20 bg-slate-900/95 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-bold text-lg">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Binance Connection
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  Default Venue
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Primary: .env.local keys | Secondary: Fast Connect (No DB Storage)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Priority Hierarchy Status Banner */}
        <div className="mt-4 space-y-4">
          {status?.hasEnvCredentials ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <span>🔒</span> Active: Environment Key (Default Primary)
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Your bot is currently operating using <code className="text-emerald-300">BINANCE_API_KEY</code> from your environment configuration.
                This primary default has full precedence. Fast Connect remains on standby as Option #2.
              </p>
            </div>
          ) : status?.credentialSource === 'fast-connect' ? (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
                  <span>⚡</span> Active: Binance Fast Connect (Option #2)
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={connecting}
                  className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                >
                  Disconnect
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Connected via Fast Connect. Permissions: Read Balances & Spot Orders.
                <span className="text-yellow-400 font-semibold ml-1">Withdrawals Strictly Disabled.</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                <span>ℹ️</span> No Default ENV Key Detected
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                No <code className="text-slate-200">BINANCE_API_KEY</code> found in <code className="text-slate-200">.env.local</code>.
                Use Fast Connect below to authorize spot trading with zero withdrawal risk.
              </p>
            </div>
          )}

          {/* Zero-Withdrawal Security Box */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Read Balances & Klines:</span>
              <span className="text-emerald-400 font-semibold">✓ Allowed</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">15m Spot Trade Orders:</span>
              <span className="text-emerald-400 font-semibold">✓ Allowed</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Withdrawal Permissions:</span>
              <span className="text-rose-400 font-bold">✕ STRICTLY FORBIDDEN</span>
            </div>
          </div>

          {/* Connect Option #2: Fast Connect Form (Available if ENV not active or user configuring secondary) */}
          {!status?.hasEnvCredentials && status?.credentialSource !== 'fast-connect' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Fast Connect Authorization
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTestnet}
                    onChange={(e) => setIsTestnet(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-yellow-500 focus:ring-0"
                  />
                  <span>Spot Testnet (Fake Funds)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Binance API Key
                </label>
                <input
                  type="text"
                  placeholder="vmPU... or Testnet Key"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-yellow-500/50 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Binance Secret Key
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={inputSecret}
                  onChange={(e) => setInputSecret(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-yellow-500/50 focus:outline-none font-mono"
                />
              </div>

              <button
                onClick={handlePairFastConnect}
                disabled={connecting || !inputKey || !inputSecret}
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {connecting ? 'Verifying Zero-Withdrawal Guard...' : '⚡ Authorize Fast Connect'}
              </button>
            </div>
          )}

          {/* Status Message */}
          {message && (
            <div
              className={`rounded-xl border px-3 py-2 text-xs ${
                message.kind === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
