import { getNotifySettings, type BinanceSquareNotifySettings } from '@/lib/notify/settings'
import {
  getSetting,
  setSetting,
  getPendingSquarePostedPredictions,
  updateSquarePostedPredictionStatus,
  recordAppNotification,
  type SquarePostedPredictionRow,
} from '@/lib/db/client'
import { fetchMultipleTickers } from '@/lib/data/binance'
import { round } from '@/lib/utils'
import type { Signal } from '@/lib/types'
import type { FutureCoinPrediction } from '@/lib/data/predictions'
import { formatPrice } from '@/lib/format'
export * from '@/lib/notify/square-templates'
import { sanitizeHashtags } from '@/lib/notify/square-templates'

/**
 * Binance Square Creator OpenAPI Publisher.
 *
 * Allows programmatic publishing of market analyses, signals, and multi-day
 * coin predictions directly to your Binance Square creator profile feed.
 *
 * Requirements:
 * - Square Publishing API Key generated from Binance Square Creator Center:
 *   https://square.binance.com/creator-center (under API Management / AI Skills).
 * - Key header: `X-Square-OpenAPI-Key`
 */

export function isBinanceSquareConfigured(override?: BinanceSquareNotifySettings): boolean {
  const square = override ?? getNotifySettings().square
  return Boolean(square?.enabled && square?.apiKey && square.apiKey.trim().length > 0)
}

export type SquarePostResponse = {
  success: boolean
  contentId?: string
  imageUrl?: string
  message?: string
  error?: string
}


/**
 * Upload an image (such as a rendered candle chart) to Binance Square Media center.
 * Returns the hosted public imageUrl accepted by the Square post OpenAPI.
 */
export async function uploadImageToSquare(
  imageBuffer: Buffer,
  override?: BinanceSquareNotifySettings,
  imageName = 'candle-chart.png'
): Promise<string> {
  const square = override ?? getNotifySettings().square
  if (!square?.apiKey || square.apiKey.trim().length === 0) {
    throw new Error('Binance Square is not configured (API key missing)')
  }

  // 1. Request S3 presigned upload URL from Binance Square
  const presignedRes = await fetch(
    'https://www.binance.com/bapi/composite/v2/public/pgc/openApi/image/presignedUrl',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        clienttype: 'binanceSkill',
        'X-Square-OpenAPI-Key': square.apiKey.trim(),
      },
      body: JSON.stringify({ imageName }),
    }
  )

  const presignedData = (await presignedRes.json().catch(() => null)) as {
    code?: string
    message?: string
    data?: { presignedUrl?: string; fileTicket?: string }
  } | null

  if (presignedData?.code !== '000000' || !presignedData?.data?.presignedUrl) {
    throw new Error(
      `Failed to request chart upload URL: ${presignedData?.message || presignedRes.statusText}`
    )
  }

  const { presignedUrl, fileTicket } = presignedData.data

  // 2. Upload image binary buffer to AWS S3
  const s3Res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: new Uint8Array(imageBuffer),
  })

  if (!s3Res.ok) {
    throw new Error(`Failed to upload chart image to S3: ${s3Res.status} ${s3Res.statusText}`)
  }

  // 3. Poll Binance Square media processing status
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    const pollRes = await fetch(
      'https://www.binance.com/bapi/composite/v2/public/pgc/openApi/image/imageStatus',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          clienttype: 'binanceSkill',
          'X-Square-OpenAPI-Key': square.apiKey.trim(),
        },
        body: JSON.stringify({ fileTicket }),
      }
    )
    const pollData = (await pollRes.json().catch(() => null)) as {
      code?: string
      data?: { status?: number; imageUrl?: string; failedReason?: string }
    } | null

    if (pollData?.data?.status === 1 && pollData?.data?.imageUrl) {
      return pollData.data.imageUrl
    }
    if (pollData?.data?.status === 2) {
      throw new Error(
        `Binance image processing failed: ${pollData?.data?.failedReason || 'Unknown error'}`
      )
    }
  }

  throw new Error('Binance Square image processing timed out')
}

/**
 * Publish arbitrary content and optional candle chart image to Binance Square feed.
 */
export async function postToBinanceSquare(
  content: string,
  override?: BinanceSquareNotifySettings,
  imageBuffer?: Buffer
): Promise<SquarePostResponse> {
  const square = override ?? getNotifySettings().square

  if (!square?.apiKey || square.apiKey.trim().length === 0) {
    return {
      success: false,
      error: 'Binance Square is not configured (API key missing)',
    }
  }

  // Official Binance Square Creator OpenAPI endpoint
  const endpoint = 'https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add'
  const safeContent = sanitizeHashtags(content, 4)

  try {
    let imageUrl: string | undefined
    if (imageBuffer && imageBuffer.length > 0) {
      try {
        imageUrl = await uploadImageToSquare(imageBuffer, square)
      } catch (uploadErr) {
        console.error('[binance-square] Failed to upload chart image, falling back to text:', uploadErr)
      }
    }

    const payload: Record<string, unknown> = {
      bodyTextOnly: safeContent,
    }

    if (imageUrl) {
      payload.contentType = 1
      payload.imageList = [imageUrl]
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Square-OpenAPI-Key': square.apiKey.trim(),
        'clienttype': 'binanceSkill',
      },
      body: JSON.stringify(payload),
    })

    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      code?: string | number
      message?: string
      data?: { contentId?: string; id?: string | number; shareLink?: string }
    } | null

    const isSuccess =
      response.ok &&
      (data?.success === true ||
        data?.code === '000000' ||
        data?.code === 0 ||
        data?.code === '0' ||
        (!data?.code && Boolean(data?.data)))

    if (!isSuccess) {
      const errMsg = data?.message ?? `HTTP ${response.status}: ${response.statusText}`
      return {
        success: false,
        error: `Binance Square publish failed: ${errMsg}`,
      }
    }

    const rawId = data?.data?.contentId ?? data?.data?.id
    const contentId = rawId != null ? String(rawId) : undefined

    return {
      success: true,
      contentId,
      imageUrl,
      message: imageUrl
        ? 'Published post with candle chart to Binance Square!'
        : 'Published to Binance Square',
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Network error'
    console.error('[binance-square] Error publishing post:', error)
    return {
      success: false,
      error: errMsg,
    }
  }
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
  pred: SquarePostedPredictionRow,
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

/**
 * Send a sample verification test post to Binance Square.
 */
export async function sendTestSquarePost(
  override?: BinanceSquareNotifySettings
): Promise<SquarePostResponse> {
  const timestamp = new Date().toISOString()
  const content = `🤖 ETH Signal Bot — Test Broadcast\n\nVerified automated API connection to Binance Square.\nTimestamp: ${timestamp}\n\n#BinanceSquare #SystematicTrading #AI`
  const res = await postToBinanceSquare(content, override)
  if (!res.success) {
    throw new Error(res.error ?? 'Failed to publish test post')
  }
  return res
}

export type SquareDailyTracker = {
  date: string
  counts: Record<string, number>
}

/**
 * Retrieve the current day's (UTC) Square post tracker from SQLite settings.
 */
export function getDailySquarePostTracker(): SquareDailyTracker {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = getSetting('square_daily_tracker')
    if (raw) {
      const parsed = JSON.parse(raw) as SquareDailyTracker
      if (parsed && parsed.date === today && typeof parsed.counts === 'object') {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors, return fresh tracker
  }
  return { date: today, counts: {} }
}

/**
 * Increment the daily post count for a given token in SQLite.
 */
export function recordSquareDailyPost(symbol: string): void {
  const today = new Date().toISOString().slice(0, 10)
  const sym = symbol.split('/')[0].toUpperCase()
  const tracker = getDailySquarePostTracker()
  if (tracker.date !== today) {
    tracker.date = today
    tracker.counts = {}
  }
  tracker.counts[sym] = (tracker.counts[sym] ?? 0) + 1
  try {
    setSetting('square_daily_tracker', JSON.stringify(tracker))
  } catch (err) {
    console.warn('[binance-square] Failed to persist daily tracker:', err)
  }
}

/**
 * Validates whether a token is allowed to auto-post and has not exceeded its daily post limit.
 */
export function canAutoPostSymbolToSquare(
  symbol: string,
  override?: BinanceSquareNotifySettings
): { allowed: boolean; reason?: string } {
  const square = override ?? getNotifySettings().square
  if (!isBinanceSquareConfigured(square)) {
    return { allowed: false, reason: 'Binance Square auto-post is disabled or unconfigured' }
  }

  const symBase = symbol.split('/')[0].toUpperCase()
  const symFull = symbol.toUpperCase()

  const allowed = square.allowedTokens ?? ['ETH', 'BTC', 'SOL']
  const isTokenAllowed =
    allowed.length === 0 ||
    allowed.includes('*') ||
    allowed.some((t) => t.toUpperCase() === symBase || t.toUpperCase() === symFull)

  if (!isTokenAllowed) {
    return {
      allowed: false,
      reason: `Token ${symBase} is not in the allowed tokens list: [${allowed.join(', ')}]`,
    }
  }

  const maxLimit = square.maxDailyPostsPerToken ?? 2
  const tracker = getDailySquarePostTracker()
  const countToday = tracker.counts[symBase] ?? 0

  if (countToday >= maxLimit) {
    return {
      allowed: false,
      reason: `Daily quota reached for ${symBase}: ${countToday}/${maxLimit} posts today (UTC ${tracker.date})`,
    }
  }

  return { allowed: true }
}

/**
 * Automatically publish signal to Square if configured, token is allowed, and daily limit is not exceeded.
 */
export async function publishSignalToSquare(
  signal: Signal,
  override?: BinanceSquareNotifySettings
): Promise<boolean> {
  const square = override ?? getNotifySettings().square
  const check = canAutoPostSymbolToSquare(signal.symbol, square)
  if (!check.allowed) {
    console.log(`[binance-square] Auto-publish skipped for ${signal.symbol}: ${check.reason}`)
    return false
  }

  try {
    const templateId = (square.defaultSignalTemplate as SignalSquareTemplateId) || 'detailed'
    const content = formatSignalForSquare(signal, templateId)
    const res = await postToBinanceSquare(content, square)
    if (res.success) {
      recordSquareDailyPost(signal.symbol)
      return true
    }
    return false
  } catch (err) {
    console.error('[binance-square] Auto-publish failed:', err)
    return false
  }
}

export type CheckMetPredictionsResult = {
  checked: number
  metCount: number
  stoppedCount: number
  expiredCount: number
  details: Array<{
    symbol: string
    id: number
    status: 'TARGET_MET' | 'STOPPED_OUT' | 'EXPIRED' | 'PENDING'
    price?: number
    gainPct?: number
    squarePostId?: string
  }>
}

/**
 * Monitors pending predictions posted to Binance Square.
 * When a coin's price meets or exceeds its target price, publishes a celebratory
 * milestone update to Binance Square and marks the prediction as TARGET_MET.
 */
export async function checkAndPublishMetSquarePredictions(
  override?: BinanceSquareNotifySettings
): Promise<CheckMetPredictionsResult> {
  const pending = getPendingSquarePostedPredictions()
  if (!pending || pending.length === 0) {
    return { checked: 0, metCount: 0, stoppedCount: 0, expiredCount: 0, details: [] }
  }

  const symbols = Array.from(new Set(pending.map((p) => p.symbol)))
  let tickers: Record<string, { price: number; high?: number; low?: number }> = {}
  try {
    tickers = await fetchMultipleTickers(symbols)
  } catch (err) {
    console.warn('[binance-square] Failed to fetch tickers for target monitoring:', err)
    return { checked: pending.length, metCount: 0, stoppedCount: 0, expiredCount: 0, details: [] }
  }

  const square = override ?? getNotifySettings().square
  const canPublish = isBinanceSquareConfigured(square)
  const now = Date.now()

  let metCount = 0
  let stoppedCount = 0
  let expiredCount = 0
  const details: CheckMetPredictionsResult['details'] = []

  for (const pred of pending) {
    const t = tickers[pred.symbol]
    if (!t || !t.price || t.price <= 0) {
      details.push({ symbol: pred.symbol, id: pred.id, status: 'PENDING' })
      continue
    }

    const currentPrice = t.price
    const highestPrice = t.high && t.high > currentPrice ? t.high : currentPrice
    const gainPct = round(((highestPrice - pred.entryPrice) / pred.entryPrice) * 100, 2)

    // Check if target is met: current price or session high reached targetPriceLow
    if (highestPrice >= pred.targetPriceLow) {
      let contentId: string | undefined
      if (canPublish) {
        try {
          const content = formatPredictionMetForSquare(pred, highestPrice)
          const res = await postToBinanceSquare(content, square)
          if (res.success) {
            contentId = res.contentId
            recordSquareDailyPost(pred.symbol)
          }
        } catch (postErr) {
          console.error(`[binance-square] Failed to post target hit for ${pred.symbol}:`, postErr)
        }
      }

      updateSquarePostedPredictionStatus(pred.id, 'TARGET_MET', highestPrice, contentId)
      metCount++

      try {
        recordAppNotification({
          type: 'hot-coin',
          level: 'success',
          title: `🎯 Target Met: ${pred.symbol}`,
          message: `Prediction target reached at $${formatPrice(highestPrice)} (+${gainPct > 0 ? '+' : ''}${gainPct}% gain)! ${contentId ? 'Published to Binance Square.' : ''}`,
          symbol: pred.symbol,
          data: JSON.stringify({ predId: pred.id, achievedPrice: highestPrice, gainPct }),
          read: 0,
        })
      } catch {}

      details.push({
        symbol: pred.symbol,
        id: pred.id,
        status: 'TARGET_MET',
        price: highestPrice,
        gainPct,
        squarePostId: contentId,
      })
      continue
    }

    // Check if stop-loss was hit (only if at least 15m elapsed since posting)
    if (pred.stopLossPrice > 0 && currentPrice <= pred.stopLossPrice && now - pred.createdAt > 15 * 60 * 1000) {
      updateSquarePostedPredictionStatus(pred.id, 'STOPPED_OUT', currentPrice)
      stoppedCount++
      details.push({
        symbol: pred.symbol,
        id: pred.id,
        status: 'STOPPED_OUT',
        price: currentPrice,
        gainPct,
      })
      continue
    }

    // Check expiration based on horizon
    const maxAgeMs =
      pred.horizon === '24H'
        ? 48 * 60 * 60 * 1000 // 48h
        : pred.horizon === '3_DAYS'
        ? 5 * 24 * 60 * 60 * 1000 // 5 days
        : 10 * 24 * 60 * 60 * 1000 // 10 days

    if (now - pred.createdAt > maxAgeMs) {
      updateSquarePostedPredictionStatus(pred.id, 'EXPIRED', currentPrice)
      expiredCount++
      details.push({
        symbol: pred.symbol,
        id: pred.id,
        status: 'EXPIRED',
        price: currentPrice,
        gainPct,
      })
      continue
    }

    details.push({
      symbol: pred.symbol,
      id: pred.id,
      status: 'PENDING',
      price: currentPrice,
      gainPct,
    })
  }

  return {
    checked: pending.length,
    metCount,
    stoppedCount,
    expiredCount,
    details,
  }
}

