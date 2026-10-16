import { ethers } from 'hardhat'

/**
 * Deploy the optional on-chain layer.
 *
 *   npm --prefix contracts run node
 *   npm --prefix contracts run deploy:local
 */
async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners()
  console.log('Deployer:', deployer.address)

  const registry = await ethers.deployContract('SignalRegistry')
  await registry.waitForDeployment()
  console.log('SignalRegistry   :', await registry.getAddress())

  const feed =
    process.env.CHAINLINK_ETH_USD_FEED ?? '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'
  const maxStaleness = 3600n

  const consumer = await ethers.deployContract('EthPriceConsumer', [feed, maxStaleness])
  await consumer.waitForDeployment()
  console.log('EthPriceConsumer :', await consumer.getAddress())
  console.log('Chainlink feed   :', feed)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
