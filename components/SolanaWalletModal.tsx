'use client'

import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

export function SolanaWalletModal({ open, onClose }: Props) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [quote, setQuote] = useState<any>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [inputAmount, setInputAmount] = useState('100')
  const [inputToken, setInputToken] = useState('USDC')
  const [outputToken, setOutputToken] = useState('SOL')
  const [swapStatus, setSwapStatus] = useState('')

  // Check if Phantom is available in window
  const isPhantomAvailable =
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { solana?: { isPhantom?: boolean } }).solana?.isPhantom)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const solana = (window as unknown as { solana?: any }).solana
      if (solana?.publicKey) {
        setWalletAddress(solana.publicKey.toString())
      }
    }
  }, [open])

  // Fetch Jupiter quote when inputs change
  useEffect(() => {
    if (open) {
      setLoadingQuote(true)
      fetch(`/api/solana?input=${inputToken}&output=${outputToken}&amount=${inputAmount}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.quote) setQuote(d)
        })
        .catch(() => {})
        .finally(() => setLoadingQuote(false))
    }
  }, [inputToken, outputToken, inputAmount, open])

  if (!open) return null

  const connectPhantom = async () => {
    if (typeof window === 'undefined') return
    const solana = (window as unknown as { solana?: any }).solana

    if (!solana) {
      window.open('https://phantom.app/', '_blank')
      return
    }

    setConnecting(true)
    try {
      const resp = await solana.connect()
      setWalletAddress(resp.publicKey.toString())
    } catch (err: any) {
      console.error('Phantom connect error:', err)
    } finally {
      setConnecting(false)
    }
  }

  const disconnectPhantom = async () => {
    const solana = (window as unknown as { solana?: any }).solana
    if (solana?.disconnect) {
      await solana.disconnect()
      setWalletAddress(null)
    }
  }

  const executeJupiterSwap = async () => {
    if (!walletAddress || !quote?.quote) return
    setSwapStatus('Building Jupiter swap transaction…')

    try {
      const swapRes = await fetch('/api/solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote.quote,
          userPublicKey: walletAddress,
        }),
      }).then((r) => r.json())

      if (!swapRes?.swapTransaction) {
        throw new Error(swapRes?.error ?? 'Failed to build transaction')
      }

      setSwapStatus('Please approve the swap in your Phantom wallet…')
      const solana = (window as unknown as { solana?: any }).solana

      // Request transaction signature from Phantom
      // Phantom's signAndSendTransaction takes a Buffer/Uint8Array of the base64 transaction
      const swapTransactionBuf = Buffer.from(swapRes.swapTransaction, 'base64')
      const tx = await solana.signAndSendTransaction(swapTransactionBuf)

      setSwapStatus(`Swap broadcasted! Signature: ${tx.signature ? tx.signature.slice(0, 10) + '…' : 'Sent'}`)
    } catch (err: any) {
      console.error('Jupiter swap execution error:', err)
      setSwapStatus(err?.message ? `Swap failed: ${err.message}` : 'Transaction rejected in wallet')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-subtle hover:text-ink text-sm font-bold"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 font-bold">
            SOL
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">Solana DEX (Jupiter Aggregator)</h2>
            <p className="text-xs text-subtle">
              Pure on-chain swaps · Phantom / Solflare wallet · Zero API keys
            </p>
          </div>
        </div>

        {/* Wallet Connection Status */}
        <div className="mt-4 rounded-xl border border-line bg-surface-tint p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-subtle font-medium">Solana Wallet:</span>
            {walletAddress ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-ink">
                  {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                </span>
                <button
                  onClick={disconnectPhantom}
                  className="text-[10px] text-down hover:underline font-bold"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectPhantom}
                disabled={connecting}
                className="rounded-lg bg-purple-600 px-3 py-1 font-bold text-white transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting
                  ? 'Connecting…'
                  : isPhantomAvailable
                  ? 'Connect Phantom'
                  : 'Install Phantom'}
              </button>
            )}
          </div>
        </div>

        {/* Jupiter Swap Simulator / Preview */}
        <div className="mt-4 rounded-xl border border-line bg-surface-tint/50 p-4 text-xs space-y-3">
          <div className="flex items-center justify-between text-ink font-semibold">
            <span>Swap Route Preview</span>
            <span className="text-[10px] text-accent font-bold uppercase">Jupiter v1 Aggregator</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-subtle">Pay</label>
              <div className="mt-1 flex items-center rounded-lg border border-line bg-surface px-2.5 py-1.5">
                <input
                  type="number"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="w-full bg-transparent font-bold text-ink outline-none"
                  placeholder="100"
                />
                <span className="font-bold text-subtle">{inputToken}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-subtle">Receive (Est.)</label>
              <div className="mt-1 flex items-center rounded-lg border border-line bg-surface px-2.5 py-1.5">
                <span className="w-full font-bold text-up">
                  {loadingQuote
                    ? 'Quoting…'
                    : quote?.outAmountHuman
                    ? quote.outAmountHuman.toFixed(4)
                    : '—'}
                </span>
                <span className="font-bold text-subtle">{outputToken}</span>
              </div>
            </div>
          </div>

          {quote && (
            <div className="rounded-lg bg-surface p-2.5 text-[11px] text-subtle space-y-1">
              <div className="flex justify-between">
                <span>Best Route:</span>
                <span className="font-semibold text-ink">
                  {quote.quote?.routePlan?.map((r: any) => r.swapInfo?.label).join(' → ') || 'Direct AMM'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rate:</span>
                <span className="font-mono text-ink">
                  1 {inputToken} ≈ {quote.effectiveRate?.toFixed(6)} {outputToken}
                </span>
              </div>
            </div>
          )}
        </div>

        {swapStatus && (
          <p className="mt-3 text-center text-xs font-semibold text-accent animate-pulse">
            {swapStatus}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line bg-surface py-2.5 text-xs font-bold text-subtle hover:bg-surface-tint"
          >
            Close
          </button>

          <button
            onClick={executeJupiterSwap}
            disabled={!walletAddress || loadingQuote}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              walletAddress && !loadingQuote
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'cursor-not-allowed bg-purple-600/40 text-white/60'
            }`}
          >
            {!walletAddress ? 'Connect Wallet First' : 'Swap via Jupiter (Phantom)'}
          </button>
        </div>
      </div>
    </div>
  )
}
