import { config } from '@/lib/config'
import { fetchChainlinkEthUsd } from '@/lib/data/chainlink'

/**
 * Diagnostic for the Chainlink ETH/USD price feed.
 *
 *   npm run check-oracle
 *
 * Surfaces the real error (RPC unreachable, wrong address, stale round…)
 * instead of the silent fallback the dashboard uses.
 */
async function main(): Promise<void> {
  console.log(`RPC   : ${config.chainlink.rpcUrl}`)
  console.log(`Feed  : ${config.chainlink.feed}`)

  try {
    const result = await fetchChainlinkEthUsd()
    console.log('')
    console.log(`✅ ETH/USD   : $${result.price.toLocaleString()}`)
    console.log(`   roundId   : ${result.roundId}`)
    console.log(`   updatedAt : ${new Date(result.updatedAt).toISOString()}`)
    console.log(`   age       : ${result.ageSeconds}s`)
  } catch (error) {
    console.log('')
    console.log(`❌ ${error instanceof Error ? error.message : String(error)}`)
    console.log('')
    console.log('Check ETH_RPC_URL in .env.local (a public endpoint may rate-limit).')
    process.exitCode = 1
  }
}

main()
