import { binance, type Exchange } from 'ccxt'
import { getExchangeSettings } from '@/lib/exchange/settings'

/**
 * Authenticated ccxt client for order placement.
 *
 * Separate from the public market-data client in `lib/data/binance.ts`: this one
 * carries credentials and may point at the Spot Testnet, so it is cached per
 * environment and reset whenever the credentials change.
 */
let cached: { key: string; exchange: Exchange } | null = null

export async function getTradingExchange(): Promise<Exchange> {
  const settings = getExchangeSettings()
  const cacheKey = `${settings.testnet ? 'testnet' : 'live'}:${settings.apiKey}`

  if (cached && cached.key === cacheKey) return cached.exchange

  const exchange = new binance({
    enableRateLimit: true,
    apiKey: settings.apiKey,
    secret: settings.secret,
    options: { defaultType: 'spot', adjustForTimeDifference: true },
  })

  // Binance Spot Testnet — fake funds, real signed-API flow.
  if (settings.testnet) exchange.setSandboxMode(true)

  await exchange.loadMarkets()

  cached = { key: cacheKey, exchange }
  return exchange
}

/** Drop the cached client (after credentials change or a fatal auth error). */
export function resetTradingExchange(): void {
  cached = null
}

/** Round a quantity down to the exchange's step size for the market. */
export function normaliseQuantity(exchange: Exchange, symbol: string, amount: number): number {
  return Number(exchange.amountToPrecision(symbol, amount))
}

/** Minimum order cost (quote currency) the exchange will accept, 0 if unknown. */
export function minimumNotional(exchange: Exchange, symbol: string): number {
  const market = exchange.market(symbol)
  return Number(market?.limits?.cost?.min ?? 0)
}

export type OcoOrderParams = {
  symbol: string
  quantity: number
  takeProfitPrice: number
  stopLossPrice: number
  stopLimitPrice?: number
}

export type OcoOrderResponse = {
  orderListId: number
  contingencyType: string
  listStatusType: string
  listOrderStatus: string
  orders: Array<{ symbol: string; orderId: number; clientOrderId: string }>
}

/**
 * Places a native Binance Spot OCO (One-Cancels-the-Other) bracket order.
 * Automatically ties Take-Profit and Stop-Loss orders directly on Binance's order book.
 */
export async function placeOcoOrder(
  exchange: Exchange,
  params: OcoOrderParams,
): Promise<OcoOrderResponse> {
  const { symbol, quantity, takeProfitPrice, stopLossPrice, stopLimitPrice } = params
  const market = exchange.market(symbol)
  const normQty = normaliseQuantity(exchange, symbol, quantity)
  const normTpPrice = exchange.priceToPrecision(symbol, takeProfitPrice)
  const normSlPrice = exchange.priceToPrecision(symbol, stopLossPrice)
  const slLimit = stopLimitPrice ?? stopLossPrice * 0.998
  const normSlLimitPrice = exchange.priceToPrecision(symbol, slLimit)

  const fn = (exchange as unknown as Record<string, Function>)['private_post_order_oco']
  if (typeof fn !== 'function') {
    throw new Error('Exchange client does not support private_post_order_oco')
  }

  const res = (await fn.call(exchange, {
    symbol: market.id,
    side: 'SELL',
    quantity: normQty,
    price: normTpPrice,
    stopPrice: normSlPrice,
    stopLimitPrice: normSlLimitPrice,
    stopLimitTimeInForce: 'GTC',
  })) as OcoOrderResponse

  return res
}

/**
 * Refuse to trade if the API key is allowed to withdraw funds.
 *
 * Fails **closed**: on mainnet, if the permission check cannot be completed we
 * refuse to trade. On testnet the endpoint does not exist, so a failure there is
 * tolerated — testnet funds have no value.
 */
let permissionsVerified = false

export async function assertWithdrawalsDisabled(exchange: Exchange): Promise<void> {
  if (permissionsVerified) return

  const settings = getExchangeSettings()

  // ccxt's generated method name for /sapi/v1/account/apiRestrictions varies by
  // version, so try the known spellings.
  const candidates = [
    'sapiGetAccountApiRestrictions',
    'privateGetSapiV1AccountApiRestrictions',
    'privateGetSapiAccountApiRestrictions',
  ]

  let restrictions: { enableWithdrawals?: boolean } | null = null
  let lastError: unknown = null

  for (const name of candidates) {
    const fn = (exchange as unknown as Record<string, unknown>)[name]
    if (typeof fn !== 'function') continue
    try {
      restrictions = (await (fn as () => Promise<unknown>).call(exchange)) as {
        enableWithdrawals?: boolean
      }
      break
    } catch (error) {
      lastError = error
      break
    }
  }

  if (restrictions === null) {
    if (settings.testnet) {
      permissionsVerified = true
      return
    }
    const detail = lastError instanceof Error ? `: ${lastError.message}` : ''
    throw new Error(
      `Could not verify API key permissions${detail} — refusing to trade on mainnet`,
    )
  }

  if (restrictions.enableWithdrawals) {
    throw new Error(
      'API key has withdrawals enabled — disable withdrawal permission before trading',
    )
  }

  permissionsVerified = true
}

/** Reset the one-time permission check (used by the diagnostic script). */
export function resetPermissionCheck(): void {
  permissionsVerified = false
}
