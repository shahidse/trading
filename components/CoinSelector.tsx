'use client'

import { useState, useMemo, useEffect } from 'react'
import { TOP_COINS, DEFAULT_SYMBOL, type CoinInfo } from '@/lib/constants/coins'

type CoinSelectorProps = {
  activeSymbol: string
  onSelectSymbol: (symbol: string) => void
}

const QUICK_COINS = [
  'ETH/USDT',
  'BTC/USDT',
  'SOL/USDT',
  'HYPE/USDT',
  'BNB/USDT',
  'PEPE/USDT',
  'DOGE/USDT',
  'XRP/USDT',
]

const CATEGORIES = [
  'All',
  'Major',
  'Layer 1',
  'Layer 2',
  'DeFi',
  'Meme',
  'AI / Data',
  'Infrastructure',
  'bStock',
  'Fan Token',
] as const

export function CoinSelector({ activeSymbol, onSelectSymbol }: CoinSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [coinPrices, setCoinPrices] = useState<Record<string, { price: number; change24h: number }>>({})

  // Fetch live prices for top 50 coins in the background
  useEffect(() => {
    let cancelled = false
    async function loadCoinData() {
      try {
        const res = await fetch('/api/coins')
        if (!res.ok) return
        const data = await res.json()
        if (data.coins && !cancelled) {
          const map: Record<string, { price: number; change24h: number }> = {}
          for (const c of data.coins) {
            if (c.price) {
              map[c.symbol] = { price: c.price, change24h: c.change24h ?? 0 }
            }
          }
          setCoinPrices(map)
        }
      } catch {
        // Degrade gracefully
      }
    }
    void loadCoinData()
    const timer = setInterval(() => void loadCoinData(), 30_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const activeCoin = useMemo(() => {
    return TOP_COINS.find((c) => c.symbol === activeSymbol) ?? {
      symbol: activeSymbol,
      base: activeSymbol.split('/')[0] ?? activeSymbol,
      quote: 'USDT',
      name: activeSymbol,
      category: 'Major' as const,
    }
  }, [activeSymbol])

  const filteredCoins = useMemo(() => {
    return TOP_COINS.filter((c) => {
      const matchSearch =
        c.symbol.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.base.toLowerCase().includes(search.toLowerCase())
      const matchCat =
        selectedCategory === 'All' ? true : c.category.toLowerCase() === selectedCategory.toLowerCase()
      return matchSearch && matchCat
    })
  }, [search, selectedCategory])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Active Symbol Display & Modal Trigger */}
      <div className="relative">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 transition-all hover:border-emerald-500/50 hover:bg-surface-3"
          title="Click to switch among Top 50 Coins"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
            {activeCoin.base.slice(0, 3)}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold text-ink">{activeCoin.symbol}</span>
              {activeCoin.symbol === DEFAULT_SYMBOL && (
                <span className="rounded bg-emerald-500/15 px-1 py-0.2 text-[9px] font-semibold tracking-wide text-emerald-400">
                  DEFAULT
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted">{activeCoin.name}</p>
          </div>
          <svg
            className="ml-1 h-3.5 w-3.5 text-subtle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Quick-switch pills for trending top coins */}
      <div className="hidden sm:flex items-center gap-1 overflow-x-auto py-1">
        {QUICK_COINS.map((sym) => {
          const isSelected = sym === activeSymbol
          const base = sym.split('/')[0]
          return (
            <button
              key={sym}
              onClick={() => onSelectSymbol(sym)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                isSelected
                  ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-sm'
                  : 'border border-transparent bg-surface-2 text-subtle hover:border-line hover:text-ink'
              }`}
            >
              {base}
              {sym === DEFAULT_SYMBOL ? ' ★' : ''}
            </button>
          )
        })}

        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg border border-dashed border-line bg-surface-2/60 px-2.5 py-1 text-xs font-medium text-muted hover:border-emerald-500/40 hover:text-ink"
        >
          + 50 Coins
        </button>
      </div>

      {/* Top 50 Coins Search Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-ink">Select Coin to Trade</h3>
                <p className="text-xs text-muted">
                  Top liquid crypto & tokenized bStock markets · Default: Ethereum (ETH/USDT)
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 pb-2">
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search coin (e.g. BTC, SOL, PEPE, BNB, SUI)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-2 py-2 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                        : 'bg-surface-2 text-subtle hover:text-ink'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Coin List */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filteredCoins.map((coin) => {
                  const isSelected = coin.symbol === activeSymbol
                  const live = coinPrices[coin.symbol]
                  return (
                    <button
                      key={coin.symbol}
                      onClick={() => {
                        onSelectSymbol(coin.symbol)
                        setModalOpen(false)
                      }}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-line/70 bg-surface-2/60 hover:border-line hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-surface-3 text-subtle'
                          }`}
                        >
                          {coin.base.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold text-ink">
                              {coin.symbol}
                            </span>
                            {coin.default && (
                              <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[8px] font-bold text-emerald-300">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted truncate max-w-[140px]">{coin.name}</p>
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs">
                        {live ? (
                          <>
                            <p className="font-semibold text-ink">
                              ${live.price >= 1 ? live.price.toLocaleString() : live.price.toFixed(6)}
                            </p>
                            <p
                              className={`text-[11px] ${
                                live.change24h >= 0 ? 'text-up' : 'text-down'
                              }`}
                            >
                              {live.change24h >= 0 ? '+' : ''}
                              {live.change24h.toFixed(2)}%
                            </p>
                          </>
                        ) : (
                          <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-subtle">
                            {coin.category}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {filteredCoins.length === 0 && (
                <div className="py-12 text-center text-subtle">
                  No coins found matching "{search}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-line px-5 py-3 text-right">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-line bg-surface-2 px-4 py-1.5 text-xs font-semibold text-ink hover:bg-surface-3"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
