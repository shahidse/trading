import { getNotifySettings, type BinanceSquareNotifySettings } from '@/lib/notify/settings'
import type { Signal } from '@/lib/types'
import type { FutureCoinPrediction } from '@/lib/data/predictions'
import { formatPrice } from '@/lib/format'

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
  message?: string
  error?: string
}

/**
 * Publish arbitrary content to Binance Square feed.
 */
export async function postToBinanceSquare(
  content: string,
  override?: BinanceSquareNotifySettings
): Promise<SquarePostResponse> {
  const square = override ?? getNotifySettings().square

  if (!square?.apiKey || square.apiKey.trim().length === 0) {
    return {
      success: false,
      error: 'Binance Square is not configured (API key missing)',
    }
  }

  // Official Binance Square Creator OpenAPI endpoint
  const endpoint = 'https://www.binance.com/bapi/composite/v1/private/square/openapi/post/create'

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Square-OpenAPI-Key': square.apiKey.trim(),
      },
      body: JSON.stringify({
        bodyTextOnly: content,
      }),
    })

    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      code?: string | number
      message?: string
      data?: { contentId?: string; id?: string }
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

    const contentId = data?.data?.contentId ?? data?.data?.id

    return {
      success: true,
      contentId,
      message: 'Published successfully to Binance Square',
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

/**
 * Format a real-time ETH spot trade signal for Binance Square.
 */
export function formatSignalForSquare(signal: Signal): string {
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

  if (signal.indicators && Array.isArray(signal.indicators) && signal.indicators.length > 0) {
    text += `\n📊 Key Indicators:\n`
    for (const ind of signal.indicators.slice(0, 4)) {
      const icon = ind.raw > 20 ? '🟢' : ind.raw < -20 ? '🔴' : '⚪'
      text += `• ${icon} ${ind.label}: ${ind.raw > 0 ? '+' : ''}${ind.raw} (${ind.detail})\n`
    }
  }

  if (signal.reasons && signal.reasons.length > 0) {
    text += `\nKey Reasons:\n`
    for (const r of signal.reasons.slice(0, 3)) {
      text += `› ${r}\n`
    }
  }

  text += `\n#BinanceSquare #CryptoSignals #${sym} #Ethereum #Trading #TechnicalAnalysis\n`
  text += `Disclaimer: Automated analysis for educational purposes only. Not financial advice.`

  return text
}

/**
 * Format a multi-day future coin prediction for Binance Square.
 */
export function formatPredictionForSquare(pred: FutureCoinPrediction): string {
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
  text += `• Confidence: ${pred.confidenceScore}%\n`
  text += `• Current Price: $${pred.currentPrice}\n`
  text += `• Target Range: $${pred.targetPriceLow} - $${pred.targetPriceHigh}\n`
  text += `• Recommended Buy Zone: $${pred.entryZoneLow} - $${pred.entryZoneHigh}\n`
  text += `• Stop Loss: $${pred.stopLossPrice} (-${pred.stopLossPct}%)\n`
  text += `• Risk / Reward: ${pred.riskRewardRatio}:1 (${pred.riskLevel} Risk)\n\n`

  text += `💡 AI Catalyst:\n${pred.catalystTitle}\n${pred.thesis}\n\n`

  if (pred.triggers && pred.triggers.length > 0) {
    text += `Validation Triggers:\n`
    pred.triggers.forEach((trig) => {
      text += `✔ ${trig}\n`
    })
    text += `\n`
  }

  text += `#BinanceSquare #CryptoGainer #${pred.name.replace(/[^a-zA-Z0-9]/g, '')} #${pred.base} #${pred.category.replace(/[^a-zA-Z0-9]/g, '')} #Altcoins #Alpha`

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

/**
 * Automatically publish signal to Square if configured and enabled.
 */
export async function publishSignalToSquare(signal: Signal): Promise<boolean> {
  if (!isBinanceSquareConfigured()) return false
  try {
    const content = formatSignalForSquare(signal)
    const res = await postToBinanceSquare(content)
    return Boolean(res.success)
  } catch (err) {
    console.error('[binance-square] Auto-publish failed:', err)
    return false
  }
}
