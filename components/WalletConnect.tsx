'use client'

import { useEffect, useState } from 'react'
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { useTheme } from '@/components/ThemeToggle'

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function WalletConnect() {
  const { themeStyle } = useTheme()
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()

  const [copied, setCopied] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: balanceData } = useBalance({
    address,
    chainId: mainnet.id,
  })

  const hasInjected =
    mounted && typeof window !== 'undefined' && Boolean((window as unknown as { ethereum?: unknown }).ethereum)

  const injectedConnector = connectors.find((c) => c.id === 'injected')
  const walletConnectConnector = connectors.find((c) => c.id === 'walletConnect')
  const coinbaseConnector = connectors.find((c) => c.id.toLowerCase().includes('coinbase'))

  const isDataDriven = themeStyle === 'data-driven'
  const isNeofuturistic = themeStyle === 'neofuturistic'
  const isPlayful = themeStyle === 'playful'
  const isBrutalist = themeStyle === 'brutalist'

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleConnect = (connector: typeof connectors[number]) => {
    connect(
      { connector },
      {
        onSuccess: () => setModalOpen(false),
      }
    )
  }

  // Connected State
  if (isConnected && address) {
    const formattedBalance = balanceData
      ? `${parseFloat(balanceData.formatted).toFixed(3)} ${balanceData.symbol}`
      : '—'

    return (
      <div
        className={`group relative flex items-center gap-2 transition ${
          isBrutalist
            ? 'border-2 border-line bg-surface p-1 shadow-[2px_2px_0px_var(--line)]'
            : isPlayful
            ? 'rounded-full border-2 border-line bg-surface py-1 pl-2.5 pr-1.5 shadow-sm'
            : isNeofuturistic
            ? 'rounded-xl border border-line bg-surface/80 py-1.5 pl-3 pr-2 shadow-md backdrop-blur-md'
            : 'rounded-lg border border-line bg-surface py-1 pl-3 pr-2 shadow-xs'
        }`}
      >
        {/* Network & Live Status Ping Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-up"></span>
          </span>
          <span
            className={`hidden text-[11px] font-bold sm:inline ${
              isBrutalist
                ? 'font-mono uppercase text-ink'
                : isNeofuturistic
                ? 'text-accent font-semibold tracking-wide'
                : isPlayful
                ? 'font-bold text-ink'
                : 'text-subtle font-medium'
            }`}
          >
            {chain?.name ?? 'Ethereum'}
          </span>
        </div>

        <div className="h-3 w-px bg-line-soft" />

        {/* Balance Badge */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold ${
            isBrutalist
              ? 'bg-accent text-white font-mono'
              : isPlayful
              ? 'rounded-full bg-accent-soft text-accent'
              : isNeofuturistic
              ? 'rounded-md bg-accent-soft text-accent'
              : 'rounded bg-surface-2 text-ink font-semibold'
          }`}
        >
          <span>Ξ</span>
          <span>{formattedBalance}</span>
        </div>

        {/* Address & Copy Action */}
        <button
          type="button"
          onClick={copyAddress}
          title="Click to copy address"
          className={`flex items-center gap-1 text-xs font-semibold text-ink transition hover:text-accent ${
            isBrutalist ? 'font-mono' : ''
          }`}
        >
          <span>{shorten(address)}</span>
          <span className="text-[10px] text-subtle">{copied ? '✓' : '⧉'}</span>
        </button>

        {/* Disconnect Button */}
        <button
          type="button"
          onClick={() => disconnect()}
          title="Disconnect wallet"
          className={`px-2 py-1 text-[11px] font-bold transition ${
            isBrutalist
              ? 'border border-line bg-surface-2 text-down hover:bg-down hover:text-white font-mono'
              : isPlayful
              ? 'rounded-full bg-surface-2 text-muted hover:bg-down/10 hover:text-down'
              : 'rounded-md text-muted hover:bg-down/10 hover:text-down'
          }`}
        >
          ✕
        </button>
      </div>
    )
  }

  // Disconnected / Connect Button State with Options Modal
  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={isPending}
        className={`group flex items-center gap-2 text-xs font-bold transition disabled:opacity-50 ${
          isBrutalist
            ? 'border-2 border-line bg-accent text-white px-3.5 py-2 font-mono uppercase shadow-[3px_3px_0px_var(--line)] hover:translate-x-0.5 hover:translate-y-0.5'
            : isPlayful
            ? 'rounded-full bg-gradient-to-r from-accent to-pink-500 text-white px-5 py-2 font-black shadow-md shadow-accent/25 hover:scale-105'
            : isNeofuturistic
            ? 'rounded-xl bg-gradient-to-r from-accent to-up text-white px-4 py-2 font-semibold shadow-lg shadow-accent/20 hover:brightness-110'
            : 'rounded-lg bg-indigo-500 text-white px-3.5 py-2 hover:bg-indigo-400 shadow-xs'
        }`}
      >
        <span className="text-sm transition group-hover:scale-110">⚡</span>
        <span>{isPending ? 'Connecting…' : 'Connect Wallet'}</span>
      </button>

      {/* Wallet Options Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-2xl space-y-4 ${
              isBrutalist
                ? 'border-2 border-ink shadow-[6px_6px_0px_var(--line)]'
                : isNeofuturistic
                ? 'border-cyan-500/30 shadow-cyan-500/10'
                : ''
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line-soft">
              <div>
                <h3 className="text-sm font-bold text-ink">Connect Ethereum Wallet</h3>
                <p className="text-[11px] text-subtle">
                  Choose a wallet extension or scan with any mobile wallet
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-7 w-7 rounded-full border border-line bg-surface-2 text-xs text-muted hover:text-ink hover:bg-surface-3 transition flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-400">
                {error.message.includes('User rejected')
                  ? 'Connection request was cancelled in your wallet.'
                  : error.message}
              </div>
            )}

            {/* Wallet Options List */}
            <div className="space-y-2.5">
              {/* 1. WalletConnect (Primary option when no extension is available) */}
              {walletConnectConnector && (
                <button
                  type="button"
                  onClick={() => handleConnect(walletConnectConnector)}
                  disabled={isPending}
                  className={`w-full p-3.5 rounded-2xl border transition text-left flex items-center justify-between group ${
                    !hasInjected
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                      : 'border-line bg-surface-2 hover:bg-surface-3 hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 text-lg">
                      📱
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-ink">WalletConnect</span>
                        {!hasInjected && (
                          <span className="rounded-full bg-cyan-500/20 text-cyan-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-subtle">
                        Scan QR code with Trust, Rainbow, MetaMask Mobile & 300+ wallets
                      </p>
                    </div>
                  </div>
                  <span className="text-subtle group-hover:text-ink transition text-sm">→</span>
                </button>
              )}

              {/* 2. Injected Browser Extension (MetaMask, Rabby, etc.) */}
              {injectedConnector && (
                <div
                  className={`p-3.5 rounded-2xl border transition ${
                    hasInjected
                      ? 'border-line bg-surface-2 hover:bg-surface-3'
                      : 'border-line-soft bg-surface-2/40 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 text-lg">
                        🦊
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-ink">Browser Extension</span>
                          {hasInjected ? (
                            <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              Detected
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              Not Installed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-subtle">
                          MetaMask, Rabby, Brave, or installed injected wallet
                        </p>
                      </div>
                    </div>

                    {hasInjected ? (
                      <button
                        type="button"
                        onClick={() => handleConnect(injectedConnector)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-bold shadow-xs hover:bg-accent/90 transition"
                      >
                        Connect
                      </button>
                    ) : (
                      <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl border border-line bg-surface text-muted text-xs font-semibold hover:text-ink hover:bg-surface-3 transition"
                      >
                        Install ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Coinbase Wallet */}
              {coinbaseConnector && (
                <button
                  type="button"
                  onClick={() => handleConnect(coinbaseConnector)}
                  disabled={isPending}
                  className="w-full p-3.5 rounded-2xl border border-line bg-surface-2 hover:bg-surface-3 hover:border-line-strong transition text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 text-lg">
                      🔵
                    </span>
                    <div>
                      <span className="text-xs font-bold text-ink">Coinbase Wallet</span>
                      <p className="text-[11px] text-subtle">
                        Use Coinbase Wallet mobile app or Smart Wallet passkey
                      </p>
                    </div>
                  </div>
                  <span className="text-subtle group-hover:text-ink transition text-sm">→</span>
                </button>
              )}
            </div>

            {/* Footer Notice */}
            <p className="text-[11px] text-subtle text-center pt-2 border-t border-line-soft">
              Wallet connection is optional. Signal generation, indicators, and spot trading do not require on-chain gas.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
