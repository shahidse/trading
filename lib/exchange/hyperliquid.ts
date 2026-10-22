import { hyperliquid, type Exchange } from 'ccxt'
import { config } from '@/lib/config'

const HYPERLIQUID_MAINNET_API = 'https://api.hyperliquid.xyz'
const HYPERLIQUID_TESTNET_API = 'https://api.hyperliquid-testnet.xyz'

export type HyperliquidBalance = {
  coin: string
  total: number
  hold: number
  entryNtl: number
}

export type HyperliquidState = {
  balances: HyperliquidBalance[]
  usdcBalance: number
  positions: Array<{
    coin: string
    szi: number
    entryPx: number
    unrealizedPnl: number
  }>
}

/**
 * Returns the effective Hyperliquid API URL based on testnet switch.
 */
export function getHyperliquidApiUrl(isTestnet = true): string {
  return isTestnet ? HYPERLIQUID_TESTNET_API : HYPERLIQUID_MAINNET_API
}

/**
 * Instantiates CCXT hyperliquid exchange instance.
 */
export function getHyperliquidCcxt(options: {
  testnet?: boolean
  privateKey?: string
  walletAddress?: string
} = {}): Exchange {
  const isTestnet = options.testnet ?? true
  const exchange = new hyperliquid({
    enableRateLimit: true,
    options: {
      defaultType: 'spot',
      sandboxMode: isTestnet,
    },
  })

  if (isTestnet) {
    exchange.setSandboxMode(true)
  }

  if (options.privateKey) {
    exchange.privateKey = options.privateKey
  }
  if (options.walletAddress) {
    exchange.walletAddress = options.walletAddress
  }

  return exchange
}

/**
 * Fetch spot clearinghouse balance directly from Hyperliquid L1.
 */
export async function fetchHyperliquidState(
  userAddress: string,
  isTestnet = true
): Promise<HyperliquidState> {
  const url = `${getHyperliquidApiUrl(isTestnet)}/info`

  const [spotRes, perpsRes] = await Promise.all([
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'spotClearinghouseState', user: userAddress }),
    })
      .then((r) => r.json())
      .catch(() => null),
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clearinghouseState', user: userAddress }),
    })
      .then((r) => r.json())
      .catch(() => null),
  ])

  const balances: HyperliquidBalance[] = (spotRes?.balances ?? []).map((b: any) => ({
    coin: b.coin,
    total: parseFloat(b.total ?? '0'),
    hold: parseFloat(b.hold ?? '0'),
    entryNtl: parseFloat(b.entryNtl ?? '0'),
  }))

  const usdcBal =
    balances.find((b) => b.coin === 'USDC')?.total ??
    parseFloat(perpsRes?.withdrawable ?? '0')

  const positions = (perpsRes?.assetPositions ?? []).map((p: any) => ({
    coin: p.position.coin,
    szi: parseFloat(p.position.szi ?? '0'),
    entryPx: parseFloat(p.position.entryPx ?? '0'),
    unrealizedPnl: parseFloat(p.position.unrealizedPnl ?? '0'),
  }))

  return {
    balances,
    usdcBalance: usdcBal,
    positions,
  }
}

export { buildApproveAgentEip712 } from './hyperliquid-auth'

/**
 * Submits the approved agent registration payload to Hyperliquid L1.
 */
export async function registerApprovedAgent(
  masterAddress: string,
  agentAddress: string,
  signature: string,
  isTestnet = true
): Promise<{ success: boolean; response?: any; error?: string }> {
  const url = `${getHyperliquidApiUrl(isTestnet)}/exchange`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: {
          type: 'approveAgent',
          hyperliquidChain: isTestnet ? 'Testnet' : 'Mainnet',
          signatureChainId: '0x66eee',
          agentAddress,
          agentName: 'ETH-Signal-Agent',
          nonce: Date.now(),
        },
        nonce: Date.now(),
        signature,
      }),
    })

    const data = await res.json()
    return { success: true, response: data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
