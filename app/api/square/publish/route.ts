import { NextRequest, NextResponse } from 'next/server'
import {
  isBinanceSquareConfigured,
  postToBinanceSquare,
  formatSignalForSquare,
  formatPredictionForSquare,
} from '@/lib/notify/binance-square'
import type { Signal } from '@/lib/types'
import type { FutureCoinPrediction } from '@/lib/data/predictions'

export const dynamic = 'force-dynamic'

/**
 * Endpoint to programmatically post a trade signal or multi-day coin prediction
 * to the user's Binance Square creator profile.
 *
 * Request body:
 * {
 *   type: 'signal' | 'prediction' | 'raw',
 *   signal?: Signal,
 *   prediction?: FutureCoinPrediction,
 *   content?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isBinanceSquareConfigured()) {
      return NextResponse.json(
        {
          error:
            'Binance Square is not configured. Please add your Square Creator OpenAPI Key in /settings.',
        },
        { status: 400 }
      )
    }

    const body = (await req.json()) as {
      type?: 'signal' | 'prediction' | 'raw'
      signal?: Signal
      prediction?: FutureCoinPrediction
      content?: string
    }

    let textToPublish = ''

    if (body.type === 'signal' && body.signal) {
      textToPublish = formatSignalForSquare(body.signal)
    } else if (body.type === 'prediction' && body.prediction) {
      textToPublish = formatPredictionForSquare(body.prediction)
    } else if (body.content) {
      textToPublish = body.content
    } else {
      return NextResponse.json(
        { error: 'Missing signal, prediction, or content in request body' },
        { status: 400 }
      )
    }

    const result = await postToBinanceSquare(textToPublish)

    return NextResponse.json({
      ok: true,
      contentId: result.contentId,
      message: 'Successfully published to Binance Square feed!',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to publish post to Binance Square',
      },
      { status: 500 }
    )
  }
}
