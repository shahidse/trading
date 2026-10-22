'use client'

import { useEffect, useRef, useState } from 'react'

export type WsTicker = {
  price: number
  priceChange: number
  priceChangePercent: number
  high: number
  low: number
  volume: number
  timestamp: number
}

export type WsDepthLevel = {
  price: number
  quantity: number
  total?: number
}

export type WsOrderBook = {
  bids: WsDepthLevel[]
  asks: WsDepthLevel[]
  spread: number
  spreadPercent: number
  midPrice: number
  timestamp: number
}

export type WsKline = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  isClosed: boolean
}

export type BinanceWsState = {
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  ticker: WsTicker | null
  orderBook: WsOrderBook | null
  latestKline: WsKline | null
  lastUpdated: number | null
}

export type UseBinanceWebSocketOptions = {
  symbol?: string // e.g. 'ETH/USDT'
  isTestnet?: boolean
  enabled?: boolean
}

/**
 * Real-time Binance WebSocket Stream:
 * Provides sub-100ms live ticker prices, order book depth ladder, and real-time candle updates.
 */
export function useBinanceWebSocket({
  symbol = 'ETH/USDT',
  isTestnet = false,
  enabled = true,
}: UseBinanceWebSocketOptions = {}): BinanceWsState {
  const [state, setState] = useState<BinanceWsState>({
    status: 'disconnected',
    ticker: null,
    orderBook: null,
    latestKline: null,
    lastUpdated: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cleanSymbol = symbol.replace('/', '').toLowerCase()

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    let isMounted = true
    const testnetBaseUrl = 'wss://stream.testnet.binance.vision:9443/stream'
    const liveBaseUrl = 'wss://stream.binance.com/stream'
    let currentBaseUrl = isTestnet ? testnetBaseUrl : liveBaseUrl

    const streams = [
      `${cleanSymbol}@ticker`,
      `${cleanSymbol}@depth20@100ms`,
      `${cleanSymbol}@kline_15m`,
    ].join('/')

    function connect() {
      if (!isMounted) return

      try {
        setState((prev) => ({ ...prev, status: 'connecting' }))
        const fullUrl = `${currentBaseUrl}?streams=${streams}`
        const ws = new WebSocket(fullUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!isMounted) return
          setState((prev) => ({ ...prev, status: 'connected' }))
        }

        ws.onmessage = (event) => {
          if (!isMounted) return
          try {
            const data = JSON.parse(event.data)
            const stream = data.stream
            const payload = data.data

            if (!stream || !payload) return

            if (stream.endsWith('@ticker')) {
              const price = parseFloat(payload.c)
              const priceChange = parseFloat(payload.p)
              const priceChangePercent = parseFloat(payload.P)
              const high = parseFloat(payload.h)
              const low = parseFloat(payload.l)
              const volume = parseFloat(payload.v)

              setState((prev) => ({
                ...prev,
                ticker: {
                  price,
                  priceChange,
                  priceChangePercent,
                  high,
                  low,
                  volume,
                  timestamp: payload.E,
                },
                lastUpdated: Date.now(),
              }))
            } else if (stream.endsWith('@depth20@100ms')) {
              const rawBids: [string, string][] = payload.bids || []
              const rawAsks: [string, string][] = payload.asks || []

              let runningBidTotal = 0
              const bids: WsDepthLevel[] = rawBids.slice(0, 15).map(([p, q]) => {
                const price = parseFloat(p)
                const quantity = parseFloat(q)
                runningBidTotal += quantity
                return { price, quantity, total: runningBidTotal }
              })

              let runningAskTotal = 0
              const asks: WsDepthLevel[] = rawAsks.slice(0, 15).map(([p, q]) => {
                const price = parseFloat(p)
                const quantity = parseFloat(q)
                runningAskTotal += quantity
                return { price, quantity, total: runningAskTotal }
              })

              const bestBid = bids[0]?.price ?? 0
              const bestAsk = asks[0]?.price ?? 0
              const spread = bestAsk > bestBid ? bestAsk - bestBid : 0
              const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk
              const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0

              setState((prev) => ({
                ...prev,
                orderBook: {
                  bids,
                  asks,
                  spread: Number(spread.toFixed(2)),
                  spreadPercent: Number(spreadPercent.toFixed(4)),
                  midPrice: Number(midPrice.toFixed(2)),
                  timestamp: Date.now(),
                },
                lastUpdated: Date.now(),
              }))
            } else if (stream.endsWith('@kline_15m')) {
              const k = payload.k
              if (k) {
                setState((prev) => ({
                  ...prev,
                  latestKline: {
                    time: k.t,
                    open: parseFloat(k.o),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    close: parseFloat(k.c),
                    volume: parseFloat(k.v),
                    isClosed: Boolean(k.x),
                  },
                  lastUpdated: Date.now(),
                }))
              }
            }
          } catch {
            // Ignore parse errors from heartbeat ping/pong
          }
        }

        ws.onerror = () => {
          if (!isMounted) return
          // If testnet stream fails or has network issues, fall back to live public stream
          if (currentBaseUrl === testnetBaseUrl) {
            currentBaseUrl = liveBaseUrl
          }
          setState((prev) => ({ ...prev, status: 'error' }))
        }

        ws.onclose = () => {
          if (!isMounted) return
          setState((prev) => ({ ...prev, status: 'disconnected' }))
          // Reconnect with 3s backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 3000)
        }
      } catch {
        setState((prev) => ({ ...prev, status: 'error' }))
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [cleanSymbol, isTestnet, enabled])

  return state
}
