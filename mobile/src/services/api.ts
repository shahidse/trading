/**
 * API Client for interacting with the ETH Signal Next.js Backend
 */
import {
  ChartPayload,
  CoinInfo,
  ExecutionVenue,
  FutureCoinPrediction,
  NotifySettings,
  OrderBookDepth,
  PredictionsPayload,
  PriceResponse,
  ScannerResult,
  Signal,
  TradingStateResponse,
} from '../types'
import { getDefaultApiUrl } from '../config'

class ApiClient {
  private baseUrl: string = getDefaultApiUrl()

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '')
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      })
      clearTimeout(timeout)

      if (!response.ok) {
        let errorMsg = `Server error ${response.status}`
        try {
          const errData = await response.json()
          if (errData?.error) errorMsg = errData.error
        } catch {}
        throw new Error(errorMsg)
      }

      return (await response.json()) as T
    } catch (err: any) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please verify your backend server URL.')
      }
      throw err
    }
  }

  async getPrice(symbol?: string, timeframe?: string): Promise<PriceResponse> {
    const params = new URLSearchParams()
    if (symbol) params.append('symbol', symbol)
    if (timeframe) params.append('timeframe', timeframe)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return this.request<PriceResponse>(`/api/price${qs}`)
  }

  async getSignals(limit = 30, symbol?: string): Promise<{ signals: Signal[] }> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (symbol) params.append('symbol', symbol)
    return this.request<{ signals: Signal[] }>(`/api/signals?${params.toString()}`)
  }

  async runAnalyze(symbol?: string, timeframe?: string): Promise<{ ok: boolean; signal?: Signal }> {
    const params = new URLSearchParams()
    if (symbol) params.append('symbol', symbol)
    if (timeframe) params.append('timeframe', timeframe)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ ok: boolean; signal?: Signal }>(`/api/analyze${qs}`, {
      method: 'POST',
    })
  }

  async getChart(limit = 100, symbol?: string, timeframe?: string): Promise<ChartPayload> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (symbol) params.append('symbol', symbol)
    if (timeframe) params.append('timeframe', timeframe)
    return this.request<ChartPayload>(`/api/chart?${params.toString()}`)
  }

  async getTrades(symbol?: string): Promise<TradingStateResponse> {
    const params = new URLSearchParams()
    if (symbol) params.append('symbol', symbol)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return this.request<TradingStateResponse>(`/api/trades${qs}`)
  }

  async getCoins(): Promise<{ defaultSymbol: string; coins: CoinInfo[] }> {
    return this.request<{ defaultSymbol: string; coins: CoinInfo[] }>('/api/coins')
  }

  async getScanner(): Promise<ScannerResult> {
    return this.request<ScannerResult>('/api/scanner')
  }

  async setTradingAction(action: 'halt' | 'resume' | 'arm' | 'disarm'): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>('/api/trades', {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
  }

  async updateTradingSettings(patch: Partial<TradingStateResponse['settings']>): Promise<any> {
    return this.request('/api/trades', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
  }

  async getSettings(): Promise<{ settings: NotifySettings }> {
    return this.request<{ settings: NotifySettings }>('/api/settings')
  }

  async updateSettings(patch: any): Promise<{ settings: NotifySettings }> {
    return this.request<{ settings: NotifySettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
  }

  async getPredictions(refresh = false): Promise<PredictionsPayload> {
    const qs = refresh ? '?refresh=true' : ''
    return this.request<PredictionsPayload>(`/api/predictions${qs}`)
  }

  async publishToSquare(payload: {
    type: 'signal' | 'prediction' | 'raw'
    signal?: Signal
    prediction?: FutureCoinPrediction
    content?: string
    imageBase64?: string
  }): Promise<{ success: boolean; contentId?: string; error?: string }> {
    return this.request<{ success: boolean; contentId?: string; error?: string }>('/api/square/publish', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async checkPredictionsTargets(): Promise<{ checked: number; newlyMet: number; errors: number }> {
    return this.request<{ checked: number; newlyMet: number; errors: number }>('/api/predictions/targets', {
      method: 'POST',
    })
  }

  async getVenue(): Promise<{ activeVenue: ExecutionVenue; isDefault: boolean }> {
    return this.request<{ activeVenue: ExecutionVenue; isDefault: boolean }>('/api/venue')
  }

  async setVenue(venue: ExecutionVenue): Promise<{ success: boolean; activeVenue: ExecutionVenue }> {
    return this.request<{ success: boolean; activeVenue: ExecutionVenue }>('/api/venue', {
      method: 'POST',
      body: JSON.stringify({ venue }),
    })
  }

  async getOrderBook(symbol = 'ETH/USDT'): Promise<OrderBookDepth> {
    const cleanSym = symbol.replace('/', '').toUpperCase()
    try {
      const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${cleanSym}&limit=10`)
      if (res.ok) {
        const d = await res.json()
        const bids = (d.bids || []).map((b: [string, string]) => ({
          price: parseFloat(b[0]),
          quantity: parseFloat(b[1]),
        }))
        const asks = (d.asks || []).map((a: [string, string]) => ({
          price: parseFloat(a[0]),
          quantity: parseFloat(a[1]),
        }))
        const bestBid = bids[0]?.price ?? 0
        const bestAsk = asks[0]?.price ?? 0
        const spread = Math.max(0, bestAsk - bestBid)
        const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk
        const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0
        return {
          symbol,
          bids,
          asks,
          spread,
          spreadPercent,
          midPrice,
          lastUpdated: Date.now(),
        }
      }
    } catch {}

    // Fallback: estimate book based on current price
    const p = await this.getPrice(symbol).catch(() => ({ price: 2500 }))
    const basePrice = p.price || 2500
    const bids = [
      { price: basePrice * 0.9998, quantity: 2.14 },
      { price: basePrice * 0.9995, quantity: 4.8 },
      { price: basePrice * 0.9991, quantity: 8.5 },
      { price: basePrice * 0.9985, quantity: 12.2 },
      { price: basePrice * 0.9980, quantity: 19.4 },
    ]
    const asks = [
      { price: basePrice * 1.0002, quantity: 1.85 },
      { price: basePrice * 1.0005, quantity: 3.9 },
      { price: basePrice * 1.0009, quantity: 7.1 },
      { price: basePrice * 1.0015, quantity: 11.6 },
      { price: basePrice * 1.0020, quantity: 18.2 },
    ]
    return {
      symbol,
      bids,
      asks,
      spread: basePrice * 0.0004,
      spreadPercent: 0.04,
      midPrice: basePrice,
      lastUpdated: Date.now(),
    }
  }
}

export const api = new ApiClient()
