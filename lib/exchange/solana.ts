export type SolanaToken = {
  symbol: string
  name: string
  mint: string
  decimals: number
  logoURI?: string
}

export const SOLANA_TOKENS: Record<string, SolanaToken> = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ether (Wormhole)',
    mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
    decimals: 8,
  },
  BTC: {
    symbol: 'BTC',
    name: 'Wrapped BTC (Wormhole)',
    mint: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 8,
  },
}

const JUPITER_API_URL = 'https://api.jup.ag/swap/v1'

export type JupiterQuoteResponse = {
  inputMint: string
  inAmount: string
  outputMint: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  slippageBps: number
  priceImpactPct?: string
  routePlan: Array<{
    swapInfo: {
      ammKey: string
      label: string
      inputMint: string
      outputMint: string
      inAmount: string
      outAmount: string
      feeAmount: string
      feeMint: string
    }
    percent: number
  }>
}

/**
 * Fetch optimal swap quote from Jupiter DEX Aggregator.
 * No API key needed.
 */
export async function fetchJupiterQuote(params: {
  inputMint: string
  outputMint: string
  amountLamports: number | string
  slippageBps?: number
}): Promise<JupiterQuoteResponse> {
  const { inputMint, outputMint, amountLamports, slippageBps = 50 } = params
  const url = `${JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}`

  const res = await fetch(url)
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Jupiter quote failed (${res.status}): ${errorText}`)
  }

  return (await res.json()) as JupiterQuoteResponse
}

export type JupiterSwapTransactionResponse = {
  swapTransaction: string
  lastValidBlockHeight?: number
  prioritizationFeeLamports?: number
}

/**
 * Build serialized base64 transaction from Jupiter quote.
 * Ready for Phantom or Solflare wallet to sign and send.
 */
export async function buildJupiterSwapTransaction(params: {
  quoteResponse: JupiterQuoteResponse
  userPublicKey: string
  wrapAndUnwrapSol?: boolean
}): Promise<JupiterSwapTransactionResponse> {
  const { quoteResponse, userPublicKey, wrapAndUnwrapSol = true } = params
  const url = `${JUPITER_API_URL}/swap`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Jupiter swap build failed (${res.status}): ${errorText}`)
  }

  return (await res.json()) as JupiterSwapTransactionResponse
}
