/**
 * API Client for interacting with the ETH Signal Next.js Backend
 */
import { ChartPayload, CoinInfo, NotifySettings, PriceResponse, ScannerResult, Signal, TradingStateResponse } from '../types'
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
}

export const api = new ApiClient()
