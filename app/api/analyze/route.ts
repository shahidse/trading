import { NextResponse } from 'next/server'
import { runAnalysis } from '@/lib/pipeline'

export const dynamic = 'force-dynamic'

/** Run the pipeline once: fetch → score → persist → email on change. */
export async function POST() {
  try {
    const result = await runAnalysis()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 },
    )
  }
}

/** Convenience alias so the route can be triggered from a browser URL. */
export async function GET() {
  return POST()
}
