import { config } from '@/lib/config'
import {
  countTradesSince,
  getOpenBuyPosition,
  realisedPnlSince,
  recordTradeOrder,
} from '@/lib/db/client'
import {
  assertWithdrawalsDisabled,
  getTradingExchange,
  minimumNotional,
  normaliseQuantity,
  placeOcoOrder,
} from '@/lib/exchange/client'
import {
  getExchangeSettings,
  isTradingArmed,
  type ExchangeSettings,
} from '@/lib/exchange/settings'
import type { TradeAction, TradeLevels } from '@/lib/types'

/**
 * Automatic order placement.
 *
 * Long-only spot, one position at a time. The module is split into three parts
 * so the risky bit is as small as possible:
 *
 *   1. `decideTrade`  — pure: what should happen for this plan transition?
 *   2. `checkGuards`  — pure: is every precondition satisfied?
 *   3. `executeTrade` — the only place that touches the exchange.
 *
 * Nothing here runs unless trading is explicitly armed, and the guards run
 * before any signed request is made.
 */

export type TradeSide = 'BUY' | 'SELL'

export type TradeIntent = {
  side: TradeSide
  symbol: string
  notionalUsd: number
  reason: string
}

export type TradeStatus = 'placed' | 'dry-run' | 'refused' | 'error' | 'skipped'

export type TradeOutcome = {
  status: TradeStatus
  side: TradeSide | null
  symbol: string
  quantity: number | null
  price: number | null
  notionalUsd: number | null
  reason: string
  environment: string
  realisedPnlUsd: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Base/quote currencies of a market, e.g. `ETH/USDT` → `{ base: 'ETH', quote: 'USDT' }`. */
export function pairCurrencies(symbol: string = config.symbol): { base: string; quote: string } {
  const [base = '', quote = ''] = symbol.split('/')
  return { base, quote }
}

/**
 * What (if anything) to do about a plan transition. Pure.
 *
 * `SELL` closes the position *we* opened, `BUY` opens one, and `HOLD` /
 * `STAY_OUT` do nothing. It never sells without a recorded position of our own,
 * so it cannot touch ETH you already hold in the account.
 */
export function decideTrade(
  previousAction: TradeAction | null,
  nextAction: TradeAction,
  hasOpenPosition: boolean,
  notionalUsd: number,
  symbol: string = config.symbol,
): TradeIntent | null {
  if (nextAction === 'SELL') {
    return hasOpenPosition
      ? { side: 'SELL', symbol, notionalUsd, reason: 'plan action SELL — closing position' }
      : null
  }

  if (nextAction === 'BUY' && previousAction !== 'BUY') {
    return hasOpenPosition
      ? null
      : { side: 'BUY', symbol, notionalUsd, reason: 'plan action BUY — opening position' }
  }

  return null
}

export type GuardResult = { ok: true } | { ok: false; reason: string }

/**
 * Every precondition checked before an order is sent.
 *
 * Pure — takes the settings and pre-derived state, performs no I/O — so it is
 * cheap to unit test and to display in the UI.
 */
export function checkGuards(params: {
  settings: ExchangeSettings
  notionalUsd: number
  realisedPnl24h: number
  tradesCount24h?: number
}): GuardResult {
  const { settings, notionalUsd, realisedPnl24h, tradesCount24h } = params

  if (settings.killSwitch) return { ok: false, reason: 'Kill switch is on' }
  if (!settings.enabled) return { ok: false, reason: 'Automatic trading is disabled' }
  if (!settings.apiKey || !settings.secret) {
    return { ok: false, reason: 'Binance API key / secret not configured' }
  }
  if (!Number.isFinite(notionalUsd) || notionalUsd <= 0) {
    return { ok: false, reason: 'Order size must be a positive number' }
  }
  if (notionalUsd > settings.maxNotionalUsd) {
    return {
      ok: false,
      reason: `Order $${notionalUsd.toFixed(2)} exceeds the $${settings.maxNotionalUsd.toFixed(
        2,
      )} hard cap`,
    }
  }
  if (settings.dailyLossLimitUsd > 0 && realisedPnl24h <= -settings.dailyLossLimitUsd) {
    return {
      ok: false,
      reason: `Daily loss limit reached (realised $${realisedPnl24h.toFixed(
        2,
      )} vs limit -$${settings.dailyLossLimitUsd.toFixed(2)})`,
    }
  }
  if (
    settings.maxDailyTrades > 0 &&
    tradesCount24h !== undefined &&
    tradesCount24h >= settings.maxDailyTrades
  ) {
    return {
      ok: false,
      reason: `Daily trade limit reached (${tradesCount24h}/${settings.maxDailyTrades} trades in the last 24h)`,
    }
  }

  return { ok: true }
}

export function environmentLabel(settings: ExchangeSettings): string {
  if (settings.dryRun) return 'dry-run'
  return settings.testnet ? 'testnet' : 'live'
}

/** Send one order, after checking every guard. The only signed write in the app. */
export async function executeTrade(
  intent: TradeIntent,
  signalId: number | null = null,
  levels?: TradeLevels | null,
): Promise<TradeOutcome> {
  const settings = getExchangeSettings()
  const environment = environmentLabel(settings)

  const openPosition = getOpenBuyPosition(intent.symbol)

  // A SELL is sized from the position we actually hold, not the configured notional.
  const notionalUsd =
    intent.side === 'SELL' ? (openPosition?.notionalUsd ?? 0) : intent.notionalUsd

  const guard = checkGuards({
    settings,
    notionalUsd,
    realisedPnl24h: realisedPnlSince(Date.now() - DAY_MS),
    tradesCount24h: countTradesSince(Date.now() - DAY_MS),
  })

  const log = (fields: {
    status: TradeStatus
    side?: 'BUY' | 'SELL'
    type?: string
    quantity?: number
    price?: number | null
    notionalUsd?: number
    reason: string
    realisedPnlUsd?: number | null
    response?: unknown
  }) =>
    recordTradeOrder({
      symbol: intent.symbol,
      side: fields.side ?? intent.side,
      type: fields.type ?? 'market',
      quantity: fields.quantity ?? 0,
      price: fields.price ?? null,
      notionalUsd: fields.notionalUsd ?? notionalUsd,
      status: fields.status,
      reason: fields.reason,
      environment,
      realisedPnlUsd: fields.realisedPnlUsd ?? null,
      response: fields.response === undefined ? null : JSON.stringify(fields.response),
      signalId,
    })

  const outcome = (
    status: TradeStatus,
    reason: string,
    extra: Partial<TradeOutcome> = {},
  ): TradeOutcome => ({
    status,
    side: intent.side,
    symbol: intent.symbol,
    quantity: null,
    price: null,
    notionalUsd: null,
    reason,
    environment,
    realisedPnlUsd: null,
    ...extra,
  })

  if (!guard.ok) {
    log({ status: 'refused', reason: guard.reason })
    return outcome('refused', guard.reason, { notionalUsd })
  }

  if (intent.side === 'SELL' && !openPosition) {
    const reason = 'No open position of ours to close'
    log({ status: 'skipped', reason })
    return outcome('skipped', reason)
  }

  try {
    const exchange = await getTradingExchange()
    await assertWithdrawalsDisabled(exchange)

    const ticker = await exchange.fetchTicker(intent.symbol)
    const marketPrice = Number(ticker.last ?? ticker.close)
    if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
      throw new Error('No market price available')
    }

    const rawQuantity =
      intent.side === 'BUY' ? intent.notionalUsd / marketPrice : openPosition!.quantity
    const quantity = normaliseQuantity(exchange, intent.symbol, rawQuantity)
    if (!(quantity > 0)) throw new Error('Order quantity rounds to zero')

    const estimatedCost = quantity * marketPrice
    const minCost = minimumNotional(exchange, intent.symbol)
    if (minCost > 0 && estimatedCost < minCost) {
      throw new Error(
        `Order $${estimatedCost.toFixed(2)} is below the exchange minimum of $${minCost}`,
      )
    }

    // Balance check, so the exchange never has to reject for funds.
    const balance = await exchange.fetchBalance()
    const free = balance.free as unknown as Record<string, number>

    if (intent.side === 'BUY') {
      const { quote } = pairCurrencies(intent.symbol)
      const available = Number(free[quote] ?? 0)
      if (available < estimatedCost) {
        throw new Error(
          `Insufficient ${quote}: $${available.toFixed(2)} available, $${estimatedCost.toFixed(
            2,
          )} needed`,
        )
      }
    } else {
      const { base } = pairCurrencies(intent.symbol)
      const available = Number(free[base] ?? 0)
      if (available < quantity) {
        throw new Error(`Insufficient ${base}: ${available} available, ${quantity} needed`)
      }
    }

    if (settings.dryRun) {
      const reason = `Dry run — would ${intent.side} ${quantity} ${intent.symbol} (~$${estimatedCost.toFixed(2)})`
      log({
        status: 'dry-run',
        quantity,
        price: marketPrice,
        notionalUsd: estimatedCost,
        reason,
      })

      // Simulate OCO bracket placement for dry-run
      if (
        settings.useOcoBracket &&
        intent.side === 'BUY' &&
        levels &&
        levels.takeProfit > 0 &&
        levels.stopLoss > 0
      ) {
        log({
          status: 'dry-run',
          side: 'SELL',
          type: 'oco',
          quantity,
          price: levels.takeProfit,
          notionalUsd: quantity * levels.takeProfit,
          reason: `Dry run Binance OCO bracket — TP: $${levels.takeProfit.toFixed(
            2,
          )}, SL: $${levels.stopLoss.toFixed(2)}`,
        })
      }

      return outcome('dry-run', reason, {
        quantity,
        price: marketPrice,
        notionalUsd: estimatedCost,
      })
    }

    const order = await exchange.createOrder(
      intent.symbol,
      'market',
      intent.side.toLowerCase(),
      quantity,
    )

    const fillPrice = Number(order.average ?? order.price ?? marketPrice)
    const filledQuantity = Number(order.filled ?? quantity)
    const cost = fillPrice * filledQuantity

    const realisedPnlUsd =
      intent.side === 'SELL' && openPosition?.price
        ? filledQuantity * (fillPrice - openPosition.price)
        : null

    log({
      status: 'placed',
      quantity: filledQuantity,
      price: fillPrice,
      notionalUsd: cost,
      reason: intent.reason,
      realisedPnlUsd,
      response: order,
    })

    // Automatically attach Binance native OCO bracket orders for BUY positions
    if (
      settings.useOcoBracket &&
      intent.side === 'BUY' &&
      levels &&
      levels.takeProfit > 0 &&
      levels.stopLoss > 0
    ) {
      try {
        const ocoRes = await placeOcoOrder(exchange, {
          symbol: intent.symbol,
          quantity: filledQuantity,
          takeProfitPrice: levels.takeProfit,
          stopLossPrice: levels.stopLoss,
        })
        log({
          status: 'placed',
          side: 'SELL',
          type: 'oco',
          quantity: filledQuantity,
          price: levels.takeProfit,
          notionalUsd: filledQuantity * levels.takeProfit,
          reason: `Binance native OCO bracket placed: TP $${levels.takeProfit.toFixed(
            2,
          )}, SL $${levels.stopLoss.toFixed(2)} (List #${ocoRes.orderListId})`,
          response: ocoRes,
        })
      } catch (ocoErr) {
        console.error('[trader] Warning: Failed to attach native Binance OCO order:', ocoErr)
      }
    }

    return outcome('placed', intent.reason, {
      quantity: filledQuantity,
      price: fillPrice,
      notionalUsd: cost,
      realisedPnlUsd,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log({ status: 'error', reason: message })
    return outcome('error', message)
  }
}

/**
 * Entry point used by the analysis pipeline.
 *
 * Returns null when trading is not armed, so the pipeline stays a no-op for
 * anyone who has not opted in.
 */
export async function runAutoTrade(
  previousAction: TradeAction | null,
  nextAction: TradeAction,
  signalId: number | null,
  levels?: TradeLevels | null,
): Promise<TradeOutcome | null> {
  const settings = getExchangeSettings()
  if (!isTradingArmed(settings)) return null

  const openPosition = getOpenBuyPosition(config.symbol)
  const intent = decideTrade(
    previousAction,
    nextAction,
    openPosition !== null,
    settings.notionalUsd,
    config.symbol,
  )

  if (!intent) return null
  return executeTrade(intent, signalId, levels)
}
