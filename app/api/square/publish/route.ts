import { NextRequest, NextResponse } from 'next/server'
import {
  postToBinanceSquare,
  formatSignalForSquare,
  formatPredictionForSquare,
  SIGNAL_SQUARE_TEMPLATES,
  PREDICTION_SQUARE_TEMPLATES,
  CHART_SQUARE_TEMPLATES,
  type SignalSquareTemplateId,
  type PredictionSquareTemplateId,
} from '@/lib/notify/binance-square'
import { getNotifySettings } from '@/lib/notify/settings'
import { recordSquarePostedPrediction } from '@/lib/db/client'
import type { Signal } from '@/lib/types'
import type { FutureCoinPrediction } from '@/lib/data/predictions'

export const dynamic = 'force-dynamic'

/**
 * Returns available templates for Binance Square posting.
 */
export async function GET() {
  return NextResponse.json({
    templates: {
      signal: SIGNAL_SQUARE_TEMPLATES,
      prediction: PREDICTION_SQUARE_TEMPLATES,
      chart: CHART_SQUARE_TEMPLATES,
    },
  })
}

/**
 * Endpoint to programmatically post a trade signal or multi-day coin prediction
 * to the user's Binance Square creator profile.
 *
 * Triggered manually via the Square button or modal in the app.
 */
export async function POST(req: NextRequest) {
  try {
    const square = getNotifySettings().square
    if (!square?.apiKey || square.apiKey.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Binance Square Creator OpenAPI Key is missing. Please add your Square OpenAPI Key in /settings or .env.local.',
        },
        { status: 400 }
      )
    }

    const body = (await req.json()) as {
      type?: 'signal' | 'prediction' | 'raw'
      signal?: Signal
      prediction?: FutureCoinPrediction
      content?: string
      templateId?: string
      imageBase64?: string
    }

    let textToPublish = ''

    if (body.content && body.content.trim().length > 0) {
      // User explicitly customized or accepted the preview content
      textToPublish = body.content
    } else if (body.type === 'signal' && body.signal) {
      textToPublish = formatSignalForSquare(
        body.signal,
        (body.templateId as SignalSquareTemplateId) || 'detailed'
      )
    } else if (body.type === 'prediction' && body.prediction) {
      textToPublish = formatPredictionForSquare(
        body.prediction,
        (body.templateId as PredictionSquareTemplateId) || 'alpha'
      )
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing signal, prediction, or content in request body' },
        { status: 400 }
      )
    }

    let imageBuffer: Buffer | undefined
    if (body.imageBase64 && typeof body.imageBase64 === 'string') {
      try {
        const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
        imageBuffer = Buffer.from(base64Data, 'base64')
      } catch (err) {
        console.warn('[square/publish] Invalid imageBase64 provided, skipping image:', err)
      }
    }

    const result = await postToBinanceSquare(textToPublish, square, imageBuffer)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to publish post to Binance Square',
        },
        { status: 400 }
      )
    }

    let trackedId: number | undefined
    if (body.type === 'prediction' && body.prediction) {
      try {
        trackedId = recordSquarePostedPrediction(body.prediction, result.contentId)
      } catch (dbErr) {
        console.warn('[square/publish] Failed to track posted prediction:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      ok: true,
      contentId: result.contentId,
      imageUrl: result.imageUrl,
      trackedId,
      message: result.message || 'Successfully published to Binance Square feed!',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to publish post to Binance Square',
      },
      { status: 500 }
    )
  }
}
