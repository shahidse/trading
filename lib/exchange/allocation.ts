/**
 * Pure capital allocation and position-sizing calculators.
 * Implements the 1-2% risk-per-trade rule, ATR-based sizing, and multi-tier take-profits.
 */

export type RiskSizingParams = {
  accountEquityUsd: number
  /** Risk percentage of equity per trade (typically 1.0 to 2.0). */
  riskPercent?: number
  entryPrice: number
  stopLossPrice: number
  /** Hard cap on notional order size. */
  maxNotionalUsd?: number
  /** Exchange minimum order size (Binance spot min is typically $10). */
  minNotionalUsd?: number
}

export type RiskSizingResult = {
  riskUsd: number
  stopDistancePct: number
  notionalUsd: number
  quantityEth: number
  capped: boolean
}

/**
 * Calculates position size so that hitting the stop loss loses exactly `riskPercent` of equity.
 *
 * Formula:
 *   Risk USD = Account Equity * (Risk % / 100)
 *   Stop Distance % = |Entry - Stop| / Entry
 *   Notional USD = Risk USD / Stop Distance %
 */
export function calculateRiskBasedNotional(params: RiskSizingParams): RiskSizingResult {
  const {
    accountEquityUsd,
    riskPercent = 1.5,
    entryPrice,
    stopLossPrice,
    maxNotionalUsd = 100,
    minNotionalUsd = 10,
  } = params

  if (accountEquityUsd <= 0 || entryPrice <= 0 || stopLossPrice <= 0) {
    return { riskUsd: 0, stopDistancePct: 0, notionalUsd: 0, quantityEth: 0, capped: false }
  }

  const stopDistancePct = Math.abs(entryPrice - stopLossPrice) / entryPrice
  if (stopDistancePct === 0) {
    return { riskUsd: 0, stopDistancePct: 0, notionalUsd: 0, quantityEth: 0, capped: false }
  }

  const riskUsd = accountEquityUsd * (riskPercent / 100)
  const rawNotional = riskUsd / stopDistancePct

  let notionalUsd = rawNotional
  let capped = false

  if (notionalUsd > maxNotionalUsd) {
    notionalUsd = maxNotionalUsd
    capped = true
  }

  if (notionalUsd < minNotionalUsd) {
    notionalUsd = 0
  }

  const quantityEth = notionalUsd > 0 ? notionalUsd / entryPrice : 0

  return {
    riskUsd,
    stopDistancePct,
    notionalUsd: Number(notionalUsd.toFixed(2)),
    quantityEth: Number(quantityEth.toFixed(6)),
    capped,
  }
}

export type StagedTargetsResult = {
  stopDistance: number
  stopDistancePct: number
  tp1: number
  tp2: number
  tp1Ratio: number
  tp2Ratio: number
  tp1GainPct: number
  tp2GainPct: number
}

/**
 * Computes staged take-profit targets based on risk-reward multiples.
 * Default: TP1 at 1:1.5 R:R, TP2 at 1:2.6 R:R.
 */
export function calculateStagedTargets(
  entryPrice: number,
  stopLossPrice: number,
  ratio1: number = 1.5,
  ratio2: number = 2.6,
): StagedTargetsResult {
  const stopDistance = Math.abs(entryPrice - stopLossPrice)
  const stopDistancePct = (stopDistance / entryPrice) * 100

  const tp1 = entryPrice + ratio1 * stopDistance
  const tp2 = entryPrice + ratio2 * stopDistance

  const tp1GainPct = ((tp1 - entryPrice) / entryPrice) * 100
  const tp2GainPct = ((tp2 - entryPrice) / entryPrice) * 100

  return {
    stopDistance: Number(stopDistance.toFixed(2)),
    stopDistancePct: Number(stopDistancePct.toFixed(2)),
    tp1: Number(tp1.toFixed(2)),
    tp2: Number(tp2.toFixed(2)),
    tp1Ratio: ratio1,
    tp2Ratio: ratio2,
    tp1GainPct: Number(tp1GainPct.toFixed(2)),
    tp2GainPct: Number(tp2GainPct.toFixed(2)),
  }
}

export type CryptoPortfolioSleeve = {
  totalCryptoSleeveUsd: number
  btcSleeveUsd: number
  ethSleeveUsd: number
}

/**
 * Calculates macro portfolio sleeve (1-5% institutional allocation) and 70/30 BTC/ETH split.
 */
export function calculateMacroCryptoAllocation(
  totalNetWorthUsd: number,
  cryptoPercent: number = 5,
  btcRatio: number = 0.7,
): CryptoPortfolioSleeve {
  const totalCryptoSleeveUsd = totalNetWorthUsd * (cryptoPercent / 100)
  const btcSleeveUsd = totalCryptoSleeveUsd * btcRatio
  const ethSleeveUsd = totalCryptoSleeveUsd * (1 - btcRatio)

  return {
    totalCryptoSleeveUsd: Number(totalCryptoSleeveUsd.toFixed(2)),
    btcSleeveUsd: Number(btcSleeveUsd.toFixed(2)),
    ethSleeveUsd: Number(ethSleeveUsd.toFixed(2)),
  }
}

/** Key Ethereum structural levels (USD). */
export const ETH_KEY_LEVELS = {
  PIVOTAL_SUPPORT: 2400,
  EMA_SUPPORT_MIN: 2357,
  EMA_SUPPORT_MAX: 2370,
  FORMER_RESISTANCE: 2600,
  RANGE_TOP_MIN: 2808,
  RANGE_TOP_MAX: 2813,
  BREAKOUT_LEVEL: 2825,
} as const
