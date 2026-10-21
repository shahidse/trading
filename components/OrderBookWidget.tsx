'use client'

import React from 'react'
import type { WsOrderBook } from '@/hooks/useBinanceWebSocket'

export type OrderBookWidgetProps = {
  orderBook?: WsOrderBook | null
  wsConnected?: boolean
  symbol?: string
}

export function OrderBookWidget({
  orderBook,
  wsConnected = false,
  symbol = 'ETH/USDT',
}: OrderBookWidgetProps) {
  const bids = orderBook?.bids?.slice(0, 10) ?? []
  const asks = orderBook?.asks?.slice(0, 10) ?? []

  const maxBidTotal = bids[bids.length - 1]?.total ?? 1
  const maxAskTotal = asks[asks.length - 1]?.total ?? 1
  const maxTotal = Math.max(maxBidTotal, maxAskTotal, 0.001)

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Order Book Depth
          </h3>
          <span className="text-xs font-medium text-ink">{symbol}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-zinc-500/10 text-zinc-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                wsConnected ? 'animate-pulse bg-emerald-400' : 'bg-zinc-400'
              }`}
            />
            {wsConnected ? 'Live 100ms' : 'REST'}
          </span>
        </div>
      </div>

      {orderBook ? (
        <div className="mt-4 space-y-2">
          {/* Asks (Sells) — shown top to bottom */}
          <div className="space-y-0.5">
            {asks
              .slice(0, 7)
              .reverse()
              .map((ask) => {
                const depthPct = Math.min(100, ((ask.total ?? ask.quantity) / maxTotal) * 100)
                return (
                  <div
                    key={`ask-${ask.price}`}
                    className="relative flex items-center justify-between px-2 py-0.5 text-xs font-mono"
                  >
                    <div
                      className="absolute right-0 top-0 h-full bg-rose-500/15"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="relative z-10 font-medium text-rose-400">
                      ${ask.price.toFixed(2)}
                    </span>
                    <span className="relative z-10 text-muted">{ask.quantity.toFixed(4)}</span>
                  </div>
                )
              })}
          </div>

          {/* Spread Banner */}
          <div className="my-1.5 flex items-center justify-between border-y border-line-soft bg-surface-2 px-3 py-1.5 text-xs font-mono">
            <span className="text-[11px] text-subtle">
              Spread: ${orderBook.spread.toFixed(2)} ({orderBook.spreadPercent.toFixed(3)}%)
            </span>
            <span className="font-semibold text-ink">
              Mid: ${orderBook.midPrice.toFixed(2)}
            </span>
          </div>

          {/* Bids (Buys) */}
          <div className="space-y-0.5">
            {bids.slice(0, 7).map((bid) => {
              const depthPct = Math.min(100, ((bid.total ?? bid.quantity) / maxTotal) * 100)
              return (
                <div
                  key={`bid-${bid.price}`}
                  className="relative flex items-center justify-between px-2 py-0.5 text-xs font-mono"
                >
                  <div
                    className="absolute right-0 top-0 h-full bg-emerald-500/15"
                    style={{ width: `${depthPct}%` }}
                  />
                  <span className="relative z-10 font-medium text-emerald-400">
                    ${bid.price.toFixed(2)}
                  </span>
                  <span className="relative z-10 text-muted">{bid.quantity.toFixed(4)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center text-xs text-subtle">
          Connecting to Binance order book feed...
        </div>
      )}
    </div>
  )
}
