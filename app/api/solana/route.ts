import { NextResponse } from 'next/server'
import {
  buildJupiterSwapTransaction,
  fetchJupiterQuote,
  SOLANA_TOKENS,
} from '@/lib/exchange/solana'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const inputSymbol = (url.searchParams.get('input') ?? 'USDC').toUpperCase()
    const outputSymbol = (url.searchParams.get('output') ?? 'SOL').toUpperCase()
    const amountStr = url.searchParams.get('amount') ?? '100' // in human readable token amount

    const inputToken = SOLANA_TOKENS[inputSymbol] ?? SOLANA_TOKENS.USDC
    const outputToken = SOLANA_TOKENS[outputSymbol] ?? SOLANA_TOKENS.SOL

    const amountFloat = parseFloat(amountStr) || 100
    const amountLamports = Math.round(amountFloat * 10 ** inputToken.decimals).toString()

    const quote = await fetchJupiterQuote({
      inputMint: inputToken.mint,
      outputMint: outputToken.mint,
      amountLamports,
    })

    const inAmountHuman = parseFloat(quote.inAmount) / 10 ** inputToken.decimals
    const outAmountHuman = parseFloat(quote.outAmount) / 10 ** outputToken.decimals

    return NextResponse.json({
      inputToken,
      outputToken,
      inAmountHuman,
      outAmountHuman,
      effectiveRate: inAmountHuman > 0 ? outAmountHuman / inAmountHuman : 0,
      quote,
      availableTokens: Object.values(SOLANA_TOKENS),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { quoteResponse, userPublicKey } = body

    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json(
        { error: 'quoteResponse and userPublicKey are required' },
        { status: 400 }
      )
    }

    const swapRes = await buildJupiterSwapTransaction({
      quoteResponse,
      userPublicKey,
    })

    return NextResponse.json(swapRes)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
