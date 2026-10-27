import type { Exchange } from 'ccxt'

export type SupportedExchangeId = 'binance' | 'bybit' | 'okx' | 'bitget'

export type ExchangeInfo = {
  id: SupportedExchangeId
  name: string
  logo: string
  badge: string
  makerFee: string
  takerFee: string
  requiresPassphrase: boolean
  description: string
}

export const SUPPORTED_EXCHANGES: ExchangeInfo[] = [
  {
    id: 'binance',
    name: 'Binance',
    logo: '🟡',
    badge: 'Default',
    makerFee: '0.10%',
    takerFee: '0.10%',
    requiresPassphrase: false,
    description: 'World\'s highest spot liquidity with Spot Testnet support.',
  },
  {
    id: 'bybit',
    name: 'Bybit',
    logo: '🟠',
    badge: 'Popular',
    makerFee: '0.10%',
    takerFee: '0.10%',
    requiresPassphrase: false,
    description: 'Global unified trading exchange, accessible in Binance-restricted regions.',
  },
  {
    id: 'okx',
    name: 'OKX',
    logo: '⬛',
    badge: 'Advanced',
    makerFee: '0.08%',
    takerFee: '0.10%',
    requiresPassphrase: true,
    description: 'High-speed institutional spot order books. Requires API Passphrase.',
  },
  {
    id: 'bitget',
    name: 'Bitget',
    logo: '🔵',
    badge: 'Fast',
    makerFee: '0.10%',
    takerFee: '0.10%',
    requiresPassphrase: true,
    description: 'Global spot trading and copy-trading exchange. Requires API Passphrase.',
  },
]

/**
 * Default Exchange Broker IDs used to attribute trades and receive 30%-40%
 * automated exchange fee rebates on user trade volume.
 */
export const DEFAULT_BROKER_IDS: Record<SupportedExchangeId, string> = {
  binance: 'x-ETHBOT',
  bybit: 'ethbot',
  okx: 'ethbot',
  bitget: 'ethbot',
}

/**
 * Resolve the effective broker/referral ID for a given exchange.
 */
export function getBrokerId(exchangeId: string, customBrokerId?: string): string {
  if (customBrokerId && customBrokerId.trim() !== '') {
    return customBrokerId.trim()
  }

  const ex = exchangeId.toLowerCase() as SupportedExchangeId
  if (ex === 'binance') return (typeof process !== 'undefined' && process.env?.BINANCE_BROKER_ID) || DEFAULT_BROKER_IDS.binance
  if (ex === 'bybit') return (typeof process !== 'undefined' && process.env?.BYBIT_BROKER_ID) || DEFAULT_BROKER_IDS.bybit
  if (ex === 'okx') return (typeof process !== 'undefined' && process.env?.OKX_BROKER_ID) || DEFAULT_BROKER_IDS.okx
  if (ex === 'bitget') return (typeof process !== 'undefined' && process.env?.BITGET_BROKER_ID) || DEFAULT_BROKER_IDS.bitget

  return DEFAULT_BROKER_IDS.binance
}

/**
 * Generate a unique client order ID tagged with the broker prefix.
 *
 * Examples:
 * - Binance: "x-ETHBOT_1719234823901_a9f1b" (Binance Broker OpenAPI attribution requirement)
 * - Bybit: "ethbot_1719234823901_a9f1b"
 * - OKX: "ethbot171923482"
 * - Bitget: "ethbot_1719234823901"
 */
export function generateBrokerClientOrderId(
  exchangeId: string,
  customBrokerId?: string
): string {
  const brokerId = getBrokerId(exchangeId, customBrokerId)
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 7)
  const ex = exchangeId.toLowerCase()

  if (ex === 'binance') {
    // Binance clientOrderId must begin with the broker prefix (e.g. x-...)
    const prefix = brokerId.startsWith('x-') ? brokerId : `x-${brokerId}`
    return `${prefix}_${timestamp}_${randomSuffix}`.slice(0, 32)
  }

  if (ex === 'bybit') {
    return `${brokerId}_${timestamp}_${randomSuffix}`.slice(0, 36)
  }

  if (ex === 'okx') {
    // OKX clOrdId must be alphanumeric and max 32 chars
    const cleanBroker = brokerId.replace(/[^a-zA-Z0-9]/g, '')
    return `${cleanBroker}${timestamp}${randomSuffix}`.slice(0, 32)
  }

  // Bitget / generic
  return `${brokerId}_${timestamp}_${randomSuffix}`.slice(0, 32)
}

/**
 * Build the exact CCXT order params dictionary required by each exchange
 * to attribute the trade to your broker / referral account for automated fee rebates.
 */
export function getBrokerOrderParams(
  exchangeId: string,
  customBrokerId?: string
): Record<string, unknown> {
  const brokerId = getBrokerId(exchangeId, customBrokerId)
  const ex = exchangeId.toLowerCase()
  const clientOrderId = generateBrokerClientOrderId(ex, brokerId)

  if (ex === 'binance') {
    return {
      clientOrderId,
      newClientOrderId: clientOrderId,
    }
  }

  if (ex === 'bybit') {
    return {
      brokerId,
      orderLinkId: clientOrderId,
    }
  }

  if (ex === 'okx') {
    return {
      tag: brokerId,
      clOrdId: clientOrderId,
    }
  }

  if (ex === 'bitget') {
    return {
      clientOid: clientOrderId,
    }
  }

  return { clientOrderId }
}

/**
 * Configure CCXT exchange instance options so that all internal request builders
 * and signed headers carry the broker/referral attribution.
 */
export function applyBrokerOptions(
  exchange: Exchange,
  exchangeId: string,
  customBrokerId?: string
): void {
  const brokerId = getBrokerId(exchangeId, customBrokerId)
  const ex = exchangeId.toLowerCase()

  if (!exchange.options) {
    exchange.options = {}
  }

  if (ex === 'binance') {
    exchange.options['broker'] = {
      spot: brokerId.startsWith('x-') ? brokerId : `x-${brokerId}`,
      margin: brokerId.startsWith('x-') ? brokerId : `x-${brokerId}`,
      future: brokerId.startsWith('x-') ? brokerId : `x-${brokerId}`,
      swap: brokerId.startsWith('x-') ? brokerId : `x-${brokerId}`,
      option: brokerId.startsWith('x-') ? brokerId : `x-${brokerId}`,
      inverse: brokerId.startsWith('x-') ? brokerId : `x-${brokerId}`,
    }
  } else if (ex === 'bybit' || ex === 'okx' || ex === 'bitget') {
    exchange.options['brokerId'] = brokerId
  }
}
