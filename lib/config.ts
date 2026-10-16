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
    ichimoku: 0.15,
    macd: 0.13,
    emaTrend: 0.12,
    // mean-reversion
    bollinger: 0.1,
    rsi: 0.1,
    stochRsi: 0.08,
    vwap: 0.1,
    // context / confirmation
    volume: 0.12,
    pattern: 0.1,
  },

  bollinger: { period: 20, stdDev: 2 },

  rsi: { period: 14 },

  macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },

  emaTrend: { fast: 20, mid: 50, slow: 200 },

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

  db: {
    url: process.env.DATABASE_URL ?? 'file:./data/signals.db',
  },
} as const

export type AppConfig = typeof config
