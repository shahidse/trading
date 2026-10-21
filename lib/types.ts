/** Shared domain types for the ETH signal pipeline. */

/** A single OHLCV candle. `time` is the open time in Unix milliseconds. */
export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL'

/** Every directional indicator that contributes to the composite score. */
export type IndicatorKey =
  | 'ichimoku'
  | 'macd'
  | 'emaTrend'
  | 'supertrend'
  | 'bollinger'
  | 'rsi'
  | 'stochRsi'
  | 'vwap'
  | 'volume'
  | 'pattern'

/**
 * How an indicator responds to trend strength. The ADX regime filter uses this
 * to tilt weights: in a strong trend, trend-following indicators get more say
 * and mean-reversion indicators get less (and vice versa in a range).
 */
export type IndicatorGroup = 'trend' | 'mean-reversion' | 'neutral'

/** One indicator's contribution to the composite score. */
export type IndicatorScore = {
  key: IndicatorKey
  label: string
  group: IndicatorGroup
  /** Raw indicator score in [-100, +100] (positive = bullish). */
  raw: number
  /** Configured weight before the regime tilt. */
  baseWeight: number
  /** Weight actually applied (0..1), after tilt and renormalisation. */
  weight: number
  /** raw * weight, i.e. the contribution to the composite. */
  contribution: number
  /** Short human readable explanation. */
  detail: string
  meta?: Record<string, unknown>
}

export type TrendRegime = 'trending' | 'ranging' | 'transitioning' | 'unknown'

/** ADX trend-strength + ATR volatility context for the current bar. */
export type RegimeInfo = {
  adx: number | null
  regime: TrendRegime
  /** Direction of directional movement, from +DI vs -DI. */
  direction: 'bullish' | 'bearish' | 'flat' | 'unknown'
  atrPct: number | null
  /** ATR in price terms — the basis for stop-loss and target distances. */
  atrValue: number | null
  /** Current ATR as a multiple of its recent median. */
  volatilityRatio: number | null
  /** Multiplier applied to the decision threshold (adaptive via ATR). */
  thresholdMultiplier: number
  /** Which side of the book the weights were tilted toward. */
  tilt: 'trend' | 'mean-reversion' | 'neutral'
  detail: string
}

/** Agreement analysis across the directional indicators. */
export type ConfluenceInfo = {
  /** Indicators leaning bullish / bearish beyond the agreement threshold. */
  bullish: number
  bearish: number
  /** max(bullish, bearish) and min(bullish, bearish). */
  agreeing: number
  conflicting: number
  multiplier: number
  verdict: 'strong-agreement' | 'conflict' | 'mixed'
  detail: string
}

export type TradeAction = 'BUY' | 'HOLD' | 'SELL' | 'STAY_OUT'

/** Staged take-profit tier for multi-target scale outs. */
export type StagedTarget = {
  tier: number
  price: number
  distancePct: number
  sizePct: number
  riskReward: number
  action: 'breakeven-stop' | 'trail-stop' | 'close-runner'
}

/** Where to enter, where to give up, where to take profit. */
export type TradeLevels = {
  entry: number
  stopLoss: number
  takeProfit: number
  /** Reward-to-risk ratio (target distance ÷ stop distance). */
  riskReward: number
  /** Distance from entry to stop, in percent. */
  stopDistancePct: number
  /** Distance from entry to target, in percent. */
  targetDistancePct: number
  /** Multi-tier staged scale-out targets (e.g. 50% at 1.5R, 30% at 2.6R, 20% runner). */
  stagedTargets?: StagedTarget[]
  /** Level where the protective stop is ratcheted to breakeven (entry price). */
  breakevenPrice?: number
}

/** Higher timeframe (1h / 4h) macro trend context. */
export type MacroTrendInfo = {
  timeframe: string
  verdict: 'bullish' | 'bearish' | 'neutral'
  supertrendDirection: 'bullish' | 'bearish' | null
  supertrendValue: number | null
  emaAlignment: 'bullish' | 'bearish' | 'mixed' | null
  alignmentWithSignal: 'aligned' | 'counter-trend' | 'neutral'
  detail: string
}

/** Concrete instruction derived from the signal, with levels you can act on. */
export type TradePlan = {
  action: TradeAction
  /** One imperative line, e.g. "Enter long at ~$2,420 · stop $2,410 · target $2,440". */
  headline: string
  /** What to do when you hold no position. */
  forFlat: string
  /** What to do when you already hold spot ETH. */
  forHolder: string
  /**
   * 'open'          — the setup passed the trend gate
   * 'scalp-open'    — counter-trend bullish candle bounce executed under reversal scalping mode
   * 'blocked-by-trend' — bullish score refused because the trend is bearish
   * 'no-edge'       — composite is inside the neutral band
   */
  gate: 'open' | 'scalp-open' | 'blocked-by-trend' | 'no-edge'
  levels: TradeLevels | null
  /** Protective stop for an existing position, even when no entry is advised. */
  protectiveStop: number | null
  rationale: string[]
}

export type Signal = {
  symbol: string
  timeframe: string
  direction: SignalDirection
  /** Composite score in [-100, +100]. */
  score: number
  /** Absolute strength of the composite score. */
  confidence: number
  /** Binance last price at generation time. */
  price: number
  /** Chainlink ETH/USD price, when available. */
  chainlinkPrice: number | null
  /** Percentage gap between exchange and oracle price. */
  divergencePct: number | null
  timestamp: number
  /** ADX / ATR context: trend strength, volatility and the tilted weights. */
  regime: RegimeInfo
  /** How much the directional indicators agreed with each other. */
  confluence: ConfluenceInfo
  /** The thresholds actually applied this run (adaptive via ATR). */
  thresholdsUsed: { long: number; short: number }
  /** Entry / stop-loss / take-profit instruction with levels. */
  plan: TradePlan
  indicators: IndicatorScore[]
  /** 1h macro trend filter alignment. */
  macroTrend?: MacroTrendInfo
  reasons: string[]
}

/** A single plotted point on the chart. `time` is Unix milliseconds. */
export type LinePoint = { time: number; value: number }

/** Every overlay / oscillator series the chart renders, aligned to candle time. */
export type ChartSeries = {
  candles: Candle[]
  bollinger: { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] }
  ema: { fast: LinePoint[]; mid: LinePoint[]; slow: LinePoint[] }
  vwap: LinePoint[]
  ichimoku: { conversion: LinePoint[]; base: LinePoint[]; spanA: LinePoint[]; spanB: LinePoint[] }
  rsi: LinePoint[]
  macd: { macd: LinePoint[]; signal: LinePoint[]; histogram: LinePoint[] }
  supertrend: LinePoint[]
}

/** A stored signal reduced to what the chart's markers need. */
export type ChartMarker = {
  time: number
  direction: SignalDirection
  score: number
  action: TradeAction
}

/** Trade plan levels drawn as price lines on the latest bar. */
export type ChartPlanLevels = {
  action: TradeAction
  levels: TradeLevels | null
  protectiveStop: number | null
}

/** Payload returned by `/api/chart`. */
export type ChartPayload = {
  symbol: string
  timeframe: string
  limit: number
  generatedAt: number
  series: ChartSeries
  markers: ChartMarker[]
  plan: ChartPlanLevels | null
}

/**
 * When a notification channel should fire:
 *  - `action-change`    — only when the plan action changes (default)
 *  - `direction-change` — whenever LONG/SHORT/NEUTRAL flips
 *  - `every`            — on every analysis run, no dedupe
 */
export type NotifyMode = 'action-change' | 'direction-change' | 'every'
