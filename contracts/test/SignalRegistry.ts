import { expect } from 'chai'
import { ethers } from 'hardhat'

// `any` keeps these tests independent of typechain generation order.
/* eslint-disable @typescript-eslint/no-explicit-any */

describe('SignalRegistry', () => {
  async function deploy() {
    const [owner, other] = await ethers.getSigners()
    const registry: any = await ethers.deployContract('SignalRegistry')
    await registry.waitForDeployment()
    return { registry, owner, other }
  }

  it('starts empty and records the deployer as owner', async () => {
    const { registry, owner } = await deploy()
    expect(await registry.count()).to.equal(0n)
    expect(await registry.owner()).to.equal(owner.address)
    await expect(registry.latest()).to.be.revertedWithCustomError(registry, 'EmptyRegistry')
  })

  it('publishes a signal and reads it back', async () => {
    const { registry } = await deploy()

    await registry.publish(1, 42, 241500000000n, 'ipfs://demo-signal')

    expect(await registry.count()).to.equal(1n)

    const latest = await registry.latest()
    expect(latest.direction).to.equal(1n) // LONG
    expect(latest.score).to.equal(42n)
    expect(latest.priceE8).to.equal(241500000000n)
    expect(latest.metadataUri).to.equal('ipfs://demo-signal')
  })

  it('emits SignalPublished', async () => {
    const { registry } = await deploy()
    await expect(registry.publish(2, -60, 240000000000n, ''))
      .to.emit(registry, 'SignalPublished')
      .withArgs(0n, 2, -60, 240000000000n, '')
  })

  it('rejects scores outside -100..100', async () => {
    const { registry } = await deploy()
    await expect(registry.publish(1, 101, 1, '')).to.be.revertedWithCustomError(
      registry,
      'InvalidScore',
    )
    await expect(registry.publish(2, -101, 1, '')).to.be.revertedWithCustomError(
      registry,
      'InvalidScore',
    )
  })

  it('only lets the owner publish', async () => {
    const { registry, other } = await deploy()
    await expect(registry.connect(other).publish(0, 0, 0, '')).to.be.revertedWithCustomError(
      registry,
      'NotOwner',
    )
  })

  it('transfers ownership', async () => {
    const { registry, other } = await deploy()

    await registry.transferOwnership(other.address)
    expect(await registry.owner()).to.equal(other.address)

    await registry.connect(other).publish(0, 0, 0, '')
    expect(await registry.count()).to.equal(1n)
  })
})

describe('EthPriceConsumer', () => {
  async function deployMock(answer: bigint, updatedAt: bigint) {
    const mock: any = await ethers.deployContract('MockAggregator', [8, answer, updatedAt])
    await mock.waitForDeployment()
    const consumer: any = await ethers.deployContract('EthPriceConsumer', [
      await mock.getAddress(),
      3600n,
    ])
    await consumer.waitForDeployment()
    return { mock, consumer }
  }

  it('reads the oracle answer and decimals', async () => {
    const { consumer } = await deployMock(241470000000n, 1_700_000_000n)

    expect(await consumer.decimals()).to.equal(8n)

    const [price, updatedAt] = await consumer.latestEthUsd()
    expect(price).to.equal(241470000000n)
    expect(updatedAt).to.equal(1_700_000_000n)
  })

  it('flags a stale answer', async () => {
    const latestBlock = await ethers.provider.getBlock('latest')
    const { consumer } = await deployMock(241470000000n, BigInt(latestBlock!.timestamp - 7200))

    expect(await consumer.isStale()).to.equal(true)
    await expect(consumer.ethUsdPrice()).to.be.revertedWithCustomError(consumer, 'StalePrice')
  })
})
