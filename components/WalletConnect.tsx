'use client'

import { useState } from 'react'
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { useTheme } from '@/components/ThemeToggle'

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function WalletConnect() {
  const { themeStyle } = useTheme()
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)

  const { data: balanceData } = useBalance({
    address,
    chainId: mainnet.id,
  })

  const injected = connectors[0]

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

  // Disconnected / Connect Button State
  return (
    <button
      type="button"
      onClick={() => injected && connect({ connector: injected })}
      disabled={!injected || isPending}
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
  )
}
