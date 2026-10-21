/** Shared domain contracts and types for the mobile app */

export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL'
export type TradeAction = 'BUY' | 'HOLD' | 'SELL' | 'STAY_OUT'
export type IndicatorGroup = 'trend' | 'mean-reversion' | 'neutral'
export type TrendRegime = 'trending' | 'ranging' | 'transitioning' | 'unknown'

export type IndicatorScore = {
  key: string
  label: string
  group: IndicatorGroup
  raw: number
  baseWeight: number
  weight: number
  contribution: number
  detail: string
  meta?: Record<string, unknown>
}

export type RegimeInfo = {
  adx: number | null
  regime: TrendRegime
  direction: 'bullish' | 'bearish' | 'flat' | 'unknown'
  atrPct: number | null
  atrValue: number | null
  volatilityRatio: number | null
  thresholdMultiplier: number
  tilt: 'trend' | 'mean-reversion' | 'neutral'
  detail: string
}

export type ConfluenceInfo = {
  bullish: number
  bearish: number
  agreeing: number
  conflicting: number
  multiplier: number
  verdict: 'strong-agreement' | 'conflict' | 'mixed'
  detail: string
}

export type StagedTarget = {
  tier: number
  price: number
  distancePct: number
  sizePct: number
  riskReward: number
  action: 'breakeven-stop' | 'trail-stop' | 'close-runner'
}

export type TradeLevels = {
  entry: number
  stopLoss: number
  takeProfit: number
  riskReward: number
  stopDistancePct: number
  targetDistancePct: number
  stagedTargets?: StagedTarget[]
  breakevenPrice?: number
}

export type MacroTrendInfo = {
  timeframe: string
  verdict: 'bullish' | 'bearish' | 'neutral'
  supertrendDirection: 'bullish' | 'bearish' | null
  supertrendValue: number | null
  emaAlignment: 'bullish' | 'bearish' | 'mixed' | null
  alignmentWithSignal: 'aligned' | 'counter-trend' | 'neutral'
  detail: string
}

export type TradePlan = {
  action: TradeAction
  headline: string
  forFlat: string
  forHolder: string
  gate: 'open' | 'scalp-open' | 'blocked-by-trend' | 'no-edge'
  levels: TradeLevels | null
  protectiveStop: number | null
  rationale: string[]
}

export type Signal = {
  id?: number
  symbol: string
  timeframe: string
  direction: SignalDirection
  score: number
  confidence: number
  price: number
  chainlinkPrice: number | null
  divergencePct: number | null
  timestamp: number
  regime: RegimeInfo
  confluence: ConfluenceInfo
  thresholdsUsed: { long: number; short: number }
  plan: TradePlan
  indicators: IndicatorScore[]
  macroTrend?: MacroTrendInfo
  reasons: string[]
}

export type PriceResponse = {
  symbol: string
  timeframe: string
  price: number | null
  chainlink: { price: number; updatedAt: number; ageSeconds: number } | null
  divergencePct: number | null
}

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type LinePoint = { time: number; value: number }

export type ChartPayload = {
  symbol: string
  timeframe: string
  limit: number
  generatedAt: number
  series: {
    candles: Candle[]
    bollinger: { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] }
    ema: { fast: LinePoint[]; mid: LinePoint[]; slow: LinePoint[] }
    vwap: LinePoint[]
    ichimoku: { conversion: LinePoint[]; base: LinePoint[]; spanA: LinePoint[]; spanB: LinePoint[] }
    rsi: LinePoint[]
    macd: { macd: LinePoint[]; signal: LinePoint[]; histogram: LinePoint[] }
    supertrend?: LinePoint[]
  }
  markers: Array<{
    time: number
    direction: SignalDirection
    score: number
    action: TradeAction
  }>
  plan: {
    action: TradeAction
    levels: TradeLevels | null
    protectiveStop: number | null
  } | null
}

export type TradeOrder = {
  id: number
  clientOrderId?: string
  exchangeOrderId?: string | null
  symbol: string
  side: 'BUY' | 'SELL'
  type: string
  status: 'placed' | 'dry-run' | 'refused' | 'error' | 'skipped' | 'PENDING' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED' | string
  price: number | null
  quantity: number
  notionalUsd: number
  reason?: string
  environment?: string
  feeUsd?: number | null
  realisedPnlUsd?: number | null
  signalScore?: number | null
  stopLossPrice?: number | null
  takeProfitPrice?: number | null
  dryRun?: boolean
  isTestnet?: boolean
  createdAt?: number
  executedAt?: number
}

export type TradingStateResponse = {
  settings: {
    enabled: boolean
    dryRun: boolean
    testnet: boolean
    killSwitch: boolean
    notionalUsd: number
    maxNotionalUsd: number
    dailyLossLimitUsd: number
    maxDailyTrades: number
    stopLossAtrMultiplier: number
    takeProfitRiskMultiplier: number
    useOcoBracket: boolean
    reversalScalpMode?: boolean
    hasApiKey: boolean
    hasSecret: boolean
  }
  orders: TradeOrder[]
  openPosition: TradeOrder | null
  realisedPnl24h: number
  symbol: string
}

export type NotifySettings = {
  email: {
    enabled: boolean
    hasApiKey: boolean
    from: string
    to: string
    trigger: string
  }
  telegram: {
    enabled: boolean
    hasToken: boolean
    chatId: string
    trigger: string
  }
}
