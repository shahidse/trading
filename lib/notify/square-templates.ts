import { formatPrice } from '@/lib/format'
import { round } from '@/lib/utils'
import type { Signal } from '@/lib/types'
import type { FutureCoinPrediction } from '@/lib/data/predictions'

export type SquarePostedPredictionInfo = {
  id: number
  symbol: string
  name: string
  base: string
  horizon: string
  horizonLabel: string
  entryPrice: number
  targetPriceLow: number
  targetPriceHigh: number
  stopLossPrice: number
  predictedGainMin: number
  predictedGainMax: number
  createdAt: number
  status: 'PENDING' | 'TARGET_MET' | 'STOPPED_OUT' | 'EXPIRED'
  squarePostId?: string
}

export type SignalSquareTemplateId = 'detailed' | 'quick' | 'confluence' | 'discussion'
export type PredictionSquareTemplateId = 'alpha' | 'breakout' | 'conservative'
export type ChartSquareTemplateId = 'standard' | 'technical'

export interface SquareTemplateOption {
  id: string
  name: string
  badge: string
  description: string
}

export const SIGNAL_SQUARE_TEMPLATES: SquareTemplateOption[] = [
  {
    id: 'detailed',
    name: 'Professional Analysis',
    badge: 'Comprehensive',
    description: 'Complete breakdown with entry, dynamic stop loss, take profit, R:R, and key indicator reasons.',
  },
  {
    id: 'quick',
    name: 'Quick Scalp Alert',
    badge: 'Fast',
    description: 'Punchy, high-impact alert with essential levels, action badge, and target/stop percentages.',
  },
  {
    id: 'confluence',
    name: 'Technical Confluence',
    badge: 'Deep Dive',
    description: 'Detailed indicator consensus, 1H macro trend alignment, ADX regime, and execution levels.',
  },
  {
    id: 'discussion',
    name: 'Community Discussion',
    badge: 'Engaging',
    description: 'Interactive post prompting Binance Square followers for their opinion and bias.',
  },
]

export const PREDICTION_SQUARE_TEMPLATES: SquareTemplateOption[] = [
  {
    id: 'alpha',
    name: 'Top Gainer Alpha Call',
    badge: 'High Conviction',
    description: 'Upside targets, buy zone, stop loss, and validation triggers.',
  },
  {
    id: 'breakout',
    name: 'Breakout Squeeze',
    badge: 'Momentum',
    description: 'Focuses on volatility compression, volume momentum, and explosive breakout potential.',
  },
  {
    id: 'conservative',
    name: 'Disciplined Swing',
    badge: 'Risk First',
    description: 'Emphasizes strict capital preservation, 1-2% risk guidelines, and R:R profile.',
  },
]

export const CHART_SQUARE_TEMPLATES: SquareTemplateOption[] = [
  {
    id: 'standard',
    name: 'Standard Chart Snapshot',
    badge: 'Clean',
    description: 'Clean chart snapshot with symbol, timeframe and current market price.',
  },
  {
    id: 'technical',
    name: 'Technical Breakdown',
    badge: 'In-Depth',
    description: 'Structured chart commentary highlighting key levels and price structure.',
  },
]

/**
 * Binance Square OpenAPI strictly limits posts to a maximum of 5 hashtags (error 220094).
 * We enforce a safe cap of 4 hashtags, stripping excess '#' symbols into plain text.
 */
export function sanitizeHashtags(content: string, maxHashtags = 4): string {
  let count = 0
  return content.replace(/#([a-zA-Z0-9_]+)/g, (match) => {
    count++
    if (count > maxHashtags) {
      return match.slice(1)
    }
    return match
  })
}

/**
 * Format a detailed professional trade signal post for Binance Square.
 */
export function formatDetailedSignalForSquare(signal: Signal): string {
  const isBuy = signal.plan.action === 'BUY'
  const isSell = signal.plan.action === 'SELL'
  const actionIcon = isBuy ? '🟢 BUY' : isSell ? '🔴 SELL / EXIT' : '🟡 ' + signal.plan.action

  const sym = signal.symbol.split('/')[0]
  const levels = signal.plan.levels

  let text = `🚨 TRADE SIGNAL: ${signal.symbol} (${signal.timeframe})\n\n`
  text += `Action: ${signal.plan.action} ${actionIcon}\n`
  text += `Current Price: ${formatPrice(signal.price)}\n`
  text += `Direction: ${signal.direction} (Score: ${signal.score > 0 ? '+' : ''}${signal.score})\n`

  if (levels?.entry) {
    text += `Entry: ${formatPrice(levels.entry)}\n`
  }
  if (levels?.stopLoss) {
    text += `Stop Loss: ${formatPrice(levels.stopLoss)} (-${levels.stopDistancePct}%)\n`
  }
  if (levels?.takeProfit) {
    text += `Take Profit: ${formatPrice(levels.takeProfit)} (+${levels.targetDistancePct}%)\n`
  }
  if (levels?.riskReward) {
    text += `R:R: ${levels.riskReward}:1\n`
  } else if (signal.plan.protectiveStop != null) {
    text += `Protective Stop: ${formatPrice(signal.plan.protectiveStop)}\n`
  }

  if (signal.reasons && signal.reasons.length > 0) {
    text += `\nKey Reasons:\n`
    for (const r of signal.reasons.slice(0, 3)) {
      text += `› ${r}\n`
    }
  }

  text += `\n#BinanceSquare #CryptoSignals #${sym} #Trading\n`
  text += `Disclaimer: Automated analysis for educational purposes only. Not financial advice.`

  return text
}

/**
 * Format a quick scalp alert for Binance Square.
 */
export function formatQuickSignalForSquare(signal: Signal): string {
  const isBuy = signal.plan.action === 'BUY'
  const isSell = signal.plan.action === 'SELL'
  const actionIcon = isBuy ? '🟢 BUY' : isSell ? '🔴 SELL' : '🟡 ' + signal.plan.action
  const sym = signal.symbol.split('/')[0]
  const levels = signal.plan.levels

  let text = `⚡ QUICK ALERT: ${signal.symbol} (${signal.timeframe})\n\n`
  text += `Action: ${signal.plan.action} ${actionIcon}\n`
  text += `Price: ${formatPrice(signal.price)}\n`
  if (levels?.entry) text += `Entry: ${formatPrice(levels.entry)}\n`
  if (levels?.takeProfit) text += `Target: ${formatPrice(levels.takeProfit)} (+${levels.targetDistancePct}%)\n`
  if (levels?.stopLoss) text += `Stop: ${formatPrice(levels.stopLoss)} (-${levels.stopDistancePct}%)\n`
  if (levels?.riskReward) text += `R:R: ${levels.riskReward}:1\n`
  text += `Score: ${signal.score > 0 ? '+' : ''}${signal.score} (${signal.direction})\n\n`
  text += `#BinanceSquare #${sym} #CryptoAlert #Trading\n`
  text += `Disclaimer: Educational analysis, not financial advice.`
  return text
}

/**
 * Format a deep technical confluence breakdown for Binance Square.
 */
export function formatConfluenceSignalForSquare(signal: Signal): string {
  const sym = signal.symbol.split('/')[0]
  const levels = signal.plan.levels
  const isBuy = signal.plan.action === 'BUY'
  const actionIcon = isBuy ? '🟢 BUY' : '🔴 SELL'

  let text = `🔬 TECHNICAL CONFLUENCE: ${signal.symbol} (${signal.timeframe})\n\n`
  text += `Bias: ${signal.direction} (${actionIcon}) | Score: ${signal.score > 0 ? '+' : ''}${signal.score}/100\n`
  text += `Current Price: ${formatPrice(signal.price)}\n\n`

  if (signal.confluence) {
    text += `📊 Confluence Verdict: ${signal.confluence.verdict.toUpperCase().replace(/-/g, ' ')}\n`
    text += `• Agreement: ${signal.confluence.agreeing} indicators (${signal.confluence.bullish} Bullish / ${signal.confluence.bearish} Bearish)\n`
  }

  if (signal.macroTrend) {
    text += `• 1H Macro Alignment: ${signal.macroTrend.verdict.toUpperCase()} (${signal.macroTrend.alignmentWithSignal})\n`
  }

  if (signal.regime) {
    text += `• Market Regime: ${signal.regime.regime.toUpperCase()} (ADX: ${signal.regime.adx})\n`
  }

  if (levels) {
    text += `\n🎯 Execution Plan:\n`
    text += `• Entry Zone: ${formatPrice(levels.entry)}\n`
    text += `• Invalidation (SL): ${formatPrice(levels.stopLoss)} (-${levels.stopDistancePct}%)\n`
    text += `• Profit Target: ${formatPrice(levels.takeProfit)} (+${levels.targetDistancePct}%)\n`
    text += `• Risk/Reward: ${levels.riskReward}:1\n`
  }

  text += `\n#BinanceSquare #TechnicalAnalysis #${sym} #SmartMoney\n`
  text += `Disclaimer: Systematic algorithmic framework. Always manage risk.`
  return text
}

/**
 * Format an engaging community discussion post for Binance Square.
 */
export function formatDiscussionSignalForSquare(signal: Signal): string {
  const sym = signal.symbol.split('/')[0]
  const levels = signal.plan.levels
  const isBuy = signal.plan.action === 'BUY'

  let text = `💬 $${sym} SETUP — What's your view? 👇\n\n`
  text += `Our 15m algorithmic model just flagged a ${isBuy ? 'BULLISH 🟢' : 'BEARISH 🔴'} setup on ${signal.symbol} at ${formatPrice(signal.price)}.\n\n`
  text += `Key Technical Parameters:\n`
  text += `• Signal: ${signal.plan.action} (${signal.direction})\n`
  text += `• Score: ${signal.score > 0 ? '+' : ''}${signal.score} (Confidence: ${signal.confidence}%)\n`
  if (levels) {
    text += `• Entry: ${formatPrice(levels.entry)}\n`
    text += `• Take Profit: ${formatPrice(levels.takeProfit)} (+${levels.targetDistancePct}%)\n`
    text += `• Stop Loss: ${formatPrice(levels.stopLoss)} (-${levels.stopDistancePct}%)\n`
    text += `• Risk/Reward: ${levels.riskReward}:1\n`
  }

  text += `\nAre you looking to ${isBuy ? 'long' : 'short'} or waiting for confirmation? Drop your thoughts below! 🚀\n\n`
  text += `#BinanceSquare #${sym} #CryptoCommunity #TradingView\n`
  text += `Disclaimer: Not financial advice. DYOR.`
  return text
}

/**
 * Format a real-time ETH spot trade signal for Binance Square using a chosen template.
 */
export function formatSignalForSquare(
  signal: Signal,
  templateId: SignalSquareTemplateId = 'detailed'
): string {
  switch (templateId) {
    case 'quick':
      return formatQuickSignalForSquare(signal)
    case 'confluence':
      return formatConfluenceSignalForSquare(signal)
    case 'discussion':
      return formatDiscussionSignalForSquare(signal)
    case 'detailed':
    default:
      return formatDetailedSignalForSquare(signal)
  }
}

/**
 * Format a high-conviction alpha call prediction for Binance Square.
 */
export function formatAlphaPredictionForSquare(pred: FutureCoinPrediction): string {
  const horizonBadge =
    pred.horizon === '24H'
      ? '⚡ Next 24 Hours'
      : pred.horizon === '3_DAYS'
      ? '🚀 3-5 Days Swing'
      : '💎 7-Day Macro'

  let text = `🔥 TOP GAINER PREDICTION: ${pred.symbol}\n`
  text += `Asset: $${pred.base} (${pred.name})\n`
  text += `Horizon: ${pred.horizonLabel} (${horizonBadge})\n\n`
  text += `🎯 Upside Target: +${pred.predictedGainPctMin}% ~ +${pred.predictedGainPctMax}%\n`
  text += `• Current Price: $${pred.currentPrice}\n`
  text += `• Target Range: $${pred.targetPriceLow} - $${pred.targetPriceHigh}\n`
  text += `• Recommended Buy Zone: $${pred.entryZoneLow} - $${pred.entryZoneHigh}\n`
  text += `• Stop Loss: $${pred.stopLossPrice} (-${pred.stopLossPct}%)\n`
  text += `• Risk / Reward: ${pred.riskRewardRatio}:1 (${pred.riskLevel} Risk)\n\n`

  if (pred.triggers && pred.triggers.length > 0) {
    text += `Validation Triggers:\n`
    pred.triggers.forEach((trig) => {
      text += `✔ ${trig}\n`
    })
    text += `\n`
  }

  text += `#BinanceSquare #${pred.name.replace(/[^a-zA-Z0-9]/g, '')} #${pred.base} #Crypto`
  return text
}

/**
 * Format a breakout squeeze prediction for Binance Square.
 */
export function formatBreakoutPredictionForSquare(pred: FutureCoinPrediction): string {
  const sym = pred.base.toUpperCase()
  let text = `🚀 BREAKOUT SQUEEZE DETECTED: $${sym}\n`
  text += `Pair: ${pred.symbol} | Category: ${pred.category}\n`
  text += `Horizon: ${pred.horizonLabel}\n\n`
  text += `⚡ Projected Surge: +${pred.predictedGainPctMin}% ~ +${pred.predictedGainPctMax}%\n`
  text += `• Current Level: $${pred.currentPrice}\n`
  text += `• Breakout Zone: $${pred.entryZoneLow} - $${pred.entryZoneHigh}\n`
  text += `• Target Expansion: $${pred.targetPriceLow} - $${pred.targetPriceHigh}\n`
  text += `• Risk Cutoff: $${pred.stopLossPrice} (-${pred.stopLossPct}%)\n`
  text += `• Risk:Reward: ${pred.riskRewardRatio}:1\n\n`
  if (pred.catalystTitle) {
    text += `Catalyst: ${pred.catalystTitle}\n`
  }
  if (pred.triggers && pred.triggers.length > 0) {
    text += `Key Triggers:\n`
    pred.triggers.slice(0, 2).forEach((trig) => {
      text += `› ${trig}\n`
    })
    text += `\n`
  }
  text += `#BinanceSquare #${sym} #CryptoBreakout #Altcoins`
  return text
}

/**
 * Format a conservative risk-managed prediction for Binance Square.
 */
export function formatConservativePredictionForSquare(pred: FutureCoinPrediction): string {
  const sym = pred.base.toUpperCase()
  let text = `🛡️ DISCIPLINED SWING SETUP: $${sym}\n`
  text += `Asset: ${pred.name} (${pred.symbol})\n`
  text += `Timeline: ${pred.horizonLabel} (${pred.riskLevel} Risk)\n\n`
  text += `📐 Risk & Reward Profile:\n`
  text += `• Risk / Reward Ratio: ${pred.riskRewardRatio}:1\n`
  text += `• Max Risk (Stop Loss): $${pred.stopLossPrice} (-${pred.stopLossPct}%)\n`
  text += `• Accumulated Buy Zone: $${pred.entryZoneLow} - $${pred.entryZoneHigh}\n`
  text += `• Upside Objective: $${pred.targetPriceLow} - $${pred.targetPriceHigh} (+${pred.predictedGainPctMin}% ~ +${pred.predictedGainPctMax}%)\n\n`
  text += `Capital Preservation: Manage position sizing; never risk more than 1-2% equity.\n\n`
  text += `#BinanceSquare #${sym} #RiskManagement #CryptoSwing`
  return text
}

/**
 * Format a multi-day future coin prediction for Binance Square using a chosen template.
 */
export function formatPredictionForSquare(
  pred: FutureCoinPrediction,
  templateId: PredictionSquareTemplateId = 'alpha'
): string {
  switch (templateId) {
    case 'breakout':
      return formatBreakoutPredictionForSquare(pred)
    case 'conservative':
      return formatConservativePredictionForSquare(pred)
    case 'alpha':
    default:
      return formatAlphaPredictionForSquare(pred)
  }
}

/**
 * Format a candlestick chart snapshot post for Binance Square.
 */
export function formatChartForSquare(
  symbol: string,
  timeframe: string,
  price?: number,
  templateId: ChartSquareTemplateId = 'standard'
): string {
  const sym = symbol.split('/')[0]
  const priceText =
    price != null
      ? `: $${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
      : ''

  if (templateId === 'technical') {
    let text = `📈 TECHNICAL CHART BREAKDOWN: ${symbol} (${timeframe})\n\n`
    text += `Current Price${priceText}\n`
    text += `Timeframe: ${timeframe} Candlestick Analysis\n\n`
    text += `Observing critical structure and volume response at current price levels.\n`
    text += `Check attached high-resolution chart for trendlines, EMAs, and momentum overlay.\n\n`
    text += `#BinanceSquare #CryptoCharts #${sym} #TechnicalAnalysis\n`
    text += `Disclaimer: For educational reference. Always conduct your own research.`
    return text
  }

  return `📊 ${symbol} (${timeframe}) Live Candlestick Chart\n\nCurrent Price${priceText}\n\n#BinanceSquare #CryptoCharts #${sym} #Trading`
}

/**
 * Format a celebratory / milestone post when a previously posted prediction meets its target.
 */
export function formatPredictionMetForSquare(
  pred: SquarePostedPredictionInfo,
  currentPrice: number
): string {
  const gainPct = round(((currentPrice - pred.entryPrice) / pred.entryPrice) * 100, 2)
  const sym = pred.base.toUpperCase()
  const targetRange = `${formatPrice(pred.targetPriceLow)} - ${formatPrice(pred.targetPriceHigh)}`

  let text = `🎯 TARGET REACHED: ${pred.symbol} 🚀\n\n`
  text += `Asset: $${pred.base} (${pred.name})\n`
  text += `Horizon: ${pred.horizonLabel}\n\n`
  text += `✅ Status: Prediction Target Met!\n`
  text += `• Entry Price: ${formatPrice(pred.entryPrice)}\n`
  text += `• Target Range: ${targetRange} (+${pred.predictedGainMin}% ~ +${pred.predictedGainMax}%)\n`
  text += `• Hit Price: ${formatPrice(currentPrice)} (${gainPct > 0 ? '+' : ''}${gainPct}% Gain) 🔥\n\n`
  text += `Target successfully achieved! Congratulations to everyone who tracked this call.\n\n`
  text += `#BinanceSquare #${sym} #Crypto #TargetHit\n`
  text += `Disclaimer: Automated milestone tracking for educational purposes. Not financial advice.`

  return text
}
