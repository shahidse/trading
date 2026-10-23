import { NextResponse } from 'next/server'
import { runAnalysis } from '@/lib/pipeline'

export const dynamic = 'force-dynamic'

/** Run the pipeline once: fetch → score → persist → alert (email/Telegram) on change. */
export async function POST(request: Request) {
  try {
    let symbol: string | undefined
    let timeframe: string | undefined
    try {
      const body = (await request.json()) as { symbol?: string; timeframe?: string } | null
      if (body?.symbol) symbol = body.symbol
      if (body?.timeframe) timeframe = body.timeframe
    } catch {
      // Body not provided or not JSON
    }
    const url = new URL(request.url)
    const urlSymbol = url.searchParams.get('symbol')
    if (urlSymbol) symbol = urlSymbol
    const urlTf = url.searchParams.get('timeframe')
    if (urlTf) timeframe = urlTf

    const result = await runAnalysis({
      ...(symbol ? { symbol } : {}),
      ...(timeframe ? { timeframe } : {}),
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 },
    )
  }
}

/** Convenience alias so the route can be triggered from a browser URL. */
export async function GET(request: Request) {
  return POST(request)
}
