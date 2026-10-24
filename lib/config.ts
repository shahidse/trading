// Side-effect import: completes `process.env` for CLI scripts too.
import '@/lib/env'

/**
 * Central configuration. Every tunable lives here and can be overridden with
 * environment variables (see .env.local.example).
 */

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

function cleanKey(value: string | undefined): string {
  if (!value) return ''
  let s = value.trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  return s
}

export const config = {
  symbol: process.env.BINANCE_SYMBOL ?? 'ETH/USDT',
  timeframe: process.env.CANDLE_INTERVAL ?? '15m',

  /** Candles requested per analysis. Ichimoku needs 52 + 26 = 78 minimum. */
  candleLimit: 300,

  thresholds: {
    // Tuned empirically: with a 4-indicator weighted composite, ±35 produces
    // almost no signals (the indicators cancel out). ±25 gives a usable flow.
    // See `npm run backtest` to re-tune.
    long: num(process.env.LONG_THRESHOLD, 25),
    short: num(process.env.SHORT_THRESHOLD, -25),
  },

  /**
   * Base weights for the directional indicators. Must sum to 1.
   *
   * These are *starting* weights: the ADX regime filter tilts them at runtime,
   * and they are renormalised over whichever indicators actually returned a
   * value. Validated with `npm run backtest`.
   */
  weights: {
    // trend-following
    ichimoku: 0.13,
    macd: 0.11,
    emaTrend: 0.1,
    supertrend: 0.1,
    // mean-reversion
    bollinger: 0.09,
    rsi: 0.09,
    stochRsi: 0.08,
    vwap: 0.09,
    // context / confirmation
    volume: 0.11,
    pattern: 0.1,
  },

  bollinger: { period: 20, stdDev: 2 },

  rsi: { period: 14 },

  macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },

  emaTrend: { fast: 20, mid: 50, slow: 200 },

  supertrend: {
    period: num(process.env.SUPERTREND_PERIOD, 10),
    multiplier: num(process.env.SUPERTREND_MULTIPLIER, 3.0),
  },

  stochRsi: { rsiPeriod: 14, stochasticPeriod: 14, kPeriod: 3, dPeriod: 3 },

  /** Rolling VWAP window. 96 × 15m = 24 hours. */
  vwap: { window: 96, deadband: 0.15 },

  volume: { lookback: 20, spikeRatio: 1.5 },

  /** ADX trend-strength regime that tilts trend vs mean-reversion weights. */
  regime: {
    period: 14,
    trendingThreshold: 25,
    rangingThreshold: 20,
    trendTilt: 1.5,
    meanReversionTilt: 0.5,
    rangingTrendTilt: 0.6,
    rangingMeanReversionTilt: 1.4,
  },

  /** ATR makes the decision threshold adaptive to volatility. */
  atr: {
    period: 14,
    adaptive: true,
    minMultiplier: 0.8,
    maxMultiplier: 1.4,
  },

  /** Confluence: reward agreement between indicators, dampen conflict. */
  confluence: {
    agreeThreshold: 15,
    strongAgreementCount: 5,
    conflictDampenCount: 3,
    agreementBoost: 1.15,
    conflictDampen: 0.7,
  },

  /**
   * Trade plan: converts a signal into entry / stop-loss / take-profit levels.
   *
   * The stop sits `stopAtrMultiple` × ATR away from entry, and the target is a
   * multiple of that risk, so the reward-to-risk ratio is explicit rather than
   * arbitrary.
   */
  trade: {
    /**
     * Measured on 2000 × 15m candles: a tight 1.5×ATR stop is the worst setting
     * (32 stops vs 12 targets — 15m noise just harvests it). 2.5–3×ATR is the
     * least bad. See the README before trusting any of it.
     */
    stopAtrMultiple: num(process.env.STOP_ATR_MULTIPLE, 2.5),
    rewardMultiple: num(process.env.REWARD_MULTIPLE, 2),
    /** Refuse LONG entries when the trend group is confirmed bearish. */
    blockCounterTrend: true,
  },

  ichimoku: {
    conversionPeriod: 9,
    basePeriod: 26,
    spanPeriod: 52,
    displacement: 26,
  },

  chainlink: {
    // Public endpoints come and go — override with ETH_RPC_URL (Alchemy/Infura)
    // for anything beyond local use. `npm run check-oracle` verifies this.
    rpcUrl: process.env.ETH_RPC_URL ?? 'https://ethereum-rpc.publicnode.com',
    /** Chainlink ETH/USD aggregator proxy on Ethereum mainnet. */
    feed:
      process.env.CHAINLINK_ETH_USD_FEED ??
      '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  },

  email: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.ALERT_EMAIL_FROM ?? 'onboarding@resend.dev',
    to: process.env.ALERT_EMAIL_TO ?? '',
  },

  telegram: {
    /** Bot token from @BotFather. */
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    /** Target chat / channel / group id. */
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  },

  binanceSquare: {
    /** Binance Square Creator OpenAPI key. */
    apiKey: cleanKey(
      process.env.BINANCE_SQUARE_OPENAPI_KEY ??
      process.env.BINANCE_SQUARE_API_KEY
    ),
  },

  /**
   * Automatic order placement.
   *
   * Every switch defaults to the safe side — trading OFF, dry-run ON, testnet ON
   * — so the app sends nothing until it is deliberately armed from /settings.
   */
  exchange: {
    /** Master arm switch. */
    enabled: bool(process.env.TRADING_ENABLED ?? process.env.AUTO_TRADE_ENABLED, false),
    /** Immediate halt, checked before every order. */
    killSwitch: bool(process.env.TRADING_KILL_SWITCH, false),
    /** Log the intended order instead of sending it. */
    dryRun: bool(process.env.TRADING_DRY_RUN ?? process.env.DRY_RUN, true),
    /** Binance Spot Testnet (fake funds) rather than mainnet. */
    testnet: bool(process.env.EXCHANGE_TESTNET ?? process.env.BINANCE_TESTNET, true),
    apiKey: cleanKey(
      process.env.BINANCE_API_KEY ??
      process.env.BINANCE_KEY ??
      process.env.BINANCE_APIKEY
    ),
    secret: cleanKey(
      process.env.BINANCE_SECRET ??
      process.env.BINANCE_API_SECRET ??
      process.env.BINANCE_SECRET_KEY
    ),
    /** Fixed notional per entry, in quote currency. */
    notionalUsd: num(process.env.TRADE_NOTIONAL_USD, 100),
    /** Hard cap — refuse any single order above this. */
    maxNotionalUsd: num(process.env.MAX_NOTIONAL_USD, 100),
    /** Rolling 24h realised-loss limit; breaching it pauses trading. */
    dailyLossLimitUsd: num(process.env.DAILY_LOSS_LIMIT_USD, 50),
    /** Max trades allowed per 24h window (default 5 for active day trading). */
    maxDailyTrades: num(process.env.MAX_DAILY_TRADES, 5),
    /** Automatically attach Binance native OCO bracket (SL + TP) on BUY orders. */
    useOcoBracket: bool(process.env.USE_OCO_BRACKET, true),
    /** Reversal scalping mode: allows BUY on strong bullish candle patterns / oversold bounce even in downtrends. */
    reversalScalpMode: bool(process.env.REVERSAL_SCALP_MODE, true),
  },

  /** Reversal Scalper parameters for intraday candle bounces */
  scalp: {
    targetDistancePct: num(process.env.SCALP_TARGET_PCT, 1.2), // 1.2% quick take profit
    stopDistancePct: num(process.env.SCALP_STOP_PCT, 0.8), // 0.8% tight protective stop
    minBullishPatternStrength: 60,
    oversoldRsiThreshold: 35,
  },

  db: {
    url: process.env.DATABASE_URL ?? 'file:./data/signals.db',
  },
} as const

export type AppConfig = typeof config
