import { NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { fetchCandles } from '@/lib/data/binance'
import { getRecentSignals } from '@/lib/db/client'
import { computeChartSeries } from '@/lib/indicators/series'
import type { ChartMarker, ChartPayload } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Candles + every indicator series the dashboard chart draws, plus markers for
 * stored signals and the latest trade-plan levels.
 *
 * Everything is computed here (not in the browser) using the same indicator
 * modules and `config` the signal engine uses, so the chart can never disagree
 * with the signal it is meant to explain.
 *
 * `?limit=500` (bars, 100–1500).
 */
export async function GET(request: Request) {
  const limitParam = new URL(request.url).searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitParam ?? 500) || 500, 100), 1500)

  try {
    const candles = await fetchCandles(config.symbol, config.timeframe, limit)
    const series = computeChartSeries(candles)

    // Markers come from persisted signals. Keep only actionable directions so
    // the chart is not littered with neutral readings.
    const firstTime = candles[0]?.time ?? 0
    const markers: ChartMarker[] = getRecentSignals(200)
      .filter((s) => s.direction !== 'NEUTRAL' && s.timestamp >= firstTime)
      .map((s) => ({
        time: s.timestamp,
        direction: s.direction,
        score: s.score,
        action: s.plan.action,
      }))
      .sort((a, b) => a.time - b.time)

    const latest = getRecentSignals(1)[0] ?? null

    const payload: ChartPayload = {
      symbol: config.symbol,
      timeframe: config.timeframe,
      limit,
      generatedAt: Date.now(),
      series,
      markers,
      plan: latest
        ? {
            action: latest.plan.action,
            levels: latest.plan.levels,
            protectiveStop: latest.plan.protectiveStop,
          }
        : null,
    }

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build chart data' },
      { status: 500 },
    )
  }
}
