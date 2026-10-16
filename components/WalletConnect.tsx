'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Wallet connection via the injected (browser) connector. */
export function WalletConnect() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const injected = connectors[0]

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right text-xs leading-tight">
          <p className="font-medium text-ink">{shorten(address)}</p>
          <p className="text-subtle">{chain?.name ?? 'unknown chain'}</p>
        </div>
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => injected && connect({ connector: injected })}
      disabled={!injected || isPending}
      className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
    >
      {isPending ? 'Connecting…' : 'Connect wallet'}
    </button>
  )
}
