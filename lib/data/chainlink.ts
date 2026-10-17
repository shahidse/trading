import { createPublicClient, formatUnits, http, parseAbi, type PublicClient } from 'viem'
import { mainnet } from 'viem/chains'
import { config } from '@/lib/config'

const aggregatorAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
])

export type ChainlinkPrice = {
  price: number
  updatedAt: number
  roundId: string
  /** Age of the oracle answer in seconds. */
  ageSeconds: number
}

let client: PublicClient | null = null

function getClient(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: mainnet,
      transport: http(config.chainlink.rpcUrl),
    })
  }
  return client
}

/**
 * Read the Chainlink ETH/USD price feed on Ethereum mainnet.
 *
 * Throws on RPC/contract failure — callers that treat the oracle as optional
 * should catch and fall back to the exchange price.
 */
export async function fetchChainlinkEthUsd(): Promise<ChainlinkPrice> {
  const publicClient = getClient()
  const feed = config.chainlink.feed as `0x${string}`

  const [decimals, roundData] = await Promise.all([
    publicClient.readContract({ address: feed, abi: aggregatorAbi, functionName: 'decimals' }),
    publicClient.readContract({ address: feed, abi: aggregatorAbi, functionName: 'latestRoundData' }),
  ])

  const [roundId, answer, , updatedAt] = roundData as unknown as readonly [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
  ]

  const price = Number(formatUnits(answer, Number(decimals)))
  const updatedAtMs = Number(updatedAt) * 1000

  return {
    price,
    updatedAt: updatedAtMs,
    roundId: roundId.toString(),
    ageSeconds: Math.max(0, Math.round((Date.now() - updatedAtMs) / 1000)),
  }
}
