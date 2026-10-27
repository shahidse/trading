import { config } from '@/lib/config'
import {
  countTradesSince,
  getOpenBuyPosition,
  getOpenDryRunPosition,
  realisedPnlSince,
  recordTradeOrder,
  type StoredTradeOrder,
} from '@/lib/db/client'
import {
  assertWithdrawalsDisabled,
  fetchLivePosition,
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
import { notifyImportantEvent } from '@/lib/notify/events'
import { getBrokerOrderParams } from '@/lib/exchange/broker'
import type { TradeAction, TradeLevels } from '@/lib/types'

/**
 * In-memory position tracking for dry-run and stateless container environments.
 * Ensures order execution operates reliably even without database persistence.
 */
export const inMemoryDryRunPositions = new Map<
  string,
  { side: TradeSide; quantity: number; price: number; notionalUsd: number; timestamp: number }
>()

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
 * In live mode:
 * `SELL` closes the position *we* opened, `BUY` opens one, and `HOLD` /
 * `STAY_OUT` do nothing. It never sells without a recorded position of our own,
 * so it cannot touch ETH you already hold in the account.
 *
 * In dry-run mode:
 * It is not required to first BUY before placing a SELL. If a SELL condition is met
 * (e.g. bearish signal or breakdown), dry-run mode simulates a SELL order directly.
 */
export function decideTrade(
  previousAction: TradeAction | null,
  nextAction: TradeAction,
  hasOpenPosition: boolean,
  notionalUsd: number,
  symbol: string = config.symbol,
  dryRun: boolean = false,
  openPositionSide: TradeSide | null = hasOpenPosition ? 'BUY' : null,
): TradeIntent | null {
  if (nextAction === 'SELL') {
    if (hasOpenPosition) {
      if (openPositionSide === 'BUY') {
        return { side: 'SELL', symbol, notionalUsd, reason: 'plan action SELL — closing position' }
      }
      return null
    }

    // In dry-run mode, an initial SELL is allowed if we don't have an open position
    if (dryRun && previousAction !== 'SELL') {
      return { side: 'SELL', symbol, notionalUsd, reason: 'plan action SELL — dry-run initial SELL' }
    }

    return null
  }

  if (nextAction === 'BUY' && previousAction !== 'BUY') {
    if (hasOpenPosition) {
      // In dry-run mode, if an open SELL position exists, BUY closes it
      if (dryRun && openPositionSide === 'SELL') {
        return { side: 'BUY', symbol, notionalUsd, reason: 'plan action BUY — closing dry-run SELL' }
      }
      return null
    }

    return { side: 'BUY', symbol, notionalUsd, reason: 'plan action BUY — opening position' }
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
  if (!settings.dryRun && (!settings.apiKey || !settings.secret)) {
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
  customSettings?: Partial<ExchangeSettings>,
): Promise<TradeOutcome> {
  const baseSettings = getExchangeSettings()
  const settings = customSettings ? { ...baseSettings, ...customSettings } : baseSettings
  const environment = environmentLabel(settings)

  let openPosition: StoredTradeOrder | null = null
  try {
    openPosition = getOpenBuyPosition(intent.symbol)
  } catch {
    // DB not available or empty in stateless deployment
  }

  let openDryRun = inMemoryDryRunPositions.get(intent.symbol)
    ? {
        side: inMemoryDryRunPositions.get(intent.symbol)!.side,
        order: inMemoryDryRunPositions.get(intent.symbol)!,
      }
    : null
  if (!openDryRun && settings.dryRun) {
    try {
      const dbDry = getOpenDryRunPosition(intent.symbol)
      if (dbDry) {
        openDryRun = {
          side: dbDry.side,
          order: {
            side: dbDry.side,
            quantity: dbDry.order.quantity,
            price: dbDry.order.price ?? 0,
            notionalUsd: dbDry.order.notionalUsd,
            timestamp: dbDry.order.createdAt,
          },
        }
      }
    } catch {}
  }

  // A SELL is sized from the position we actually hold, not the configured notional.
  let notionalUsd = intent.notionalUsd
  let liveBaseFree = 0
  if (!settings.dryRun) {
    if (intent.side === 'SELL') {
      try {
        const exchange = await getTradingExchange()
        const livePos = await fetchLivePosition(exchange, intent.symbol)
        liveBaseFree = livePos.baseFree
      } catch {
        // live balance query fallback
      }
      notionalUsd = openPosition?.notionalUsd ?? intent.notionalUsd
    }
  } else {
    if (openDryRun) {
      notionalUsd = openDryRun.order.notionalUsd
    }
  }

  let realisedPnl24h = 0
  let tradesCount24h = 0
  try {
    realisedPnl24h = realisedPnlSince(Date.now() - DAY_MS, intent.symbol)
    tradesCount24h = countTradesSince(Date.now() - DAY_MS, intent.symbol)
  } catch {
    // Stateless deployment fallback
  }

  const guard = checkGuards({
    settings,
    notionalUsd,
    realisedPnl24h,
    tradesCount24h,
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
  }) => {
    try {
      return recordTradeOrder({
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
    } catch (err) {
      console.warn('[trader] DB record skipped (stateless mode):', err)
      return 0
    }
  }

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
    if (guard.reason.includes('limit') || guard.reason.includes('hard cap')) {
      void notifyImportantEvent({
        type: 'risk',
        level: 'warning',
        title: 'Safety Guard Blocked Order',
        message: `${guard.reason} (${intent.side} ${intent.symbol})`,
        symbol: intent.symbol,
      }).catch(() => {})
    }
    return outcome('refused', guard.reason, { notionalUsd })
  }

  if (!settings.dryRun && intent.side === 'SELL') {
    // First cancel any open orders (e.g. active OCO bracket) so held tokens are unlocked and free to sell
    try {
      const exchange = await getTradingExchange()
      await exchange.cancelAllOrders(intent.symbol).catch(() => {})
      const balance = await exchange.fetchBalance()
      const { base } = pairCurrencies(intent.symbol)
      const freeMap = (balance.free as unknown as Record<string, number | undefined>) ?? {}
      liveBaseFree = Number(freeMap[base] ?? 0)
    } catch {
      // Exchange error will be caught below
    }

    if (liveBaseFree <= 0 && (!openPosition || openPosition.quantity <= 0)) {
      const reason = 'No open position of ours on exchange to close'
      log({ status: 'skipped', reason })
      return outcome('skipped', reason)
    }
  }

  try {
    const exchange = await getTradingExchange()
    if (!settings.dryRun) {
      await assertWithdrawalsDisabled(exchange)
    }

    const ticker = await exchange.fetchTicker(intent.symbol)
    const marketPrice = Number(ticker.last ?? ticker.close)
    if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
      throw new Error('No market price available')
    }

    let rawQuantity: number
    if (!settings.dryRun) {
      if (intent.side === 'BUY') {
        rawQuantity = intent.notionalUsd / marketPrice
      } else {
        const targetQty = openPosition?.quantity ?? intent.notionalUsd / marketPrice
        rawQuantity = liveBaseFree > 0 ? Math.min(targetQty, liveBaseFree) : targetQty
      }
    } else {
      if (openDryRun) {
        rawQuantity = openDryRun.order.quantity
      } else {
        rawQuantity = notionalUsd / marketPrice
      }
    }

    const quantity = normaliseQuantity(exchange, intent.symbol, rawQuantity)
    if (!(quantity > 0)) throw new Error('Order quantity rounds to zero')

    const estimatedCost = quantity * marketPrice
    const minCost = minimumNotional(exchange, intent.symbol)
    if (minCost > 0 && estimatedCost < minCost) {
      throw new Error(
        `Order $${estimatedCost.toFixed(2)} is below the exchange minimum of $${minCost}`,
      )
    }

    // Balance check, so the exchange never has to reject for funds (live/testnet only).
    if (!settings.dryRun) {
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
    }

    if (settings.dryRun) {
      let realisedPnlUsd: number | null = null
      if (openDryRun) {
        if (intent.side === 'SELL' && openDryRun.side === 'BUY' && openDryRun.order.price) {
          realisedPnlUsd = quantity * (marketPrice - openDryRun.order.price)
        } else if (intent.side === 'BUY' && openDryRun.side === 'SELL' && openDryRun.order.price) {
          realisedPnlUsd = quantity * (openDryRun.order.price - marketPrice)
        }
      }

      const isFirstSell = intent.side === 'SELL' && (!openDryRun || openDryRun.side !== 'BUY')
      const reason = `Dry run — would ${intent.side} ${quantity} ${intent.symbol} (~$${estimatedCost.toFixed(2)})${
        isFirstSell ? ' (initial SELL)' : ''
      }`
      log({
        status: 'dry-run',
        quantity,
        price: marketPrice,
        notionalUsd: estimatedCost,
        reason,
        realisedPnlUsd,
      })

      // Track dry-run in memory for stateless deployment
      if (intent.side === 'BUY') {
        inMemoryDryRunPositions.set(intent.symbol, {
          side: 'BUY',
          quantity,
          price: marketPrice,
          notionalUsd: estimatedCost,
          timestamp: Date.now(),
        })
      } else if (intent.side === 'SELL') {
        inMemoryDryRunPositions.delete(intent.symbol)
      }

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

      void notifyImportantEvent({
        type: 'trade',
        level: 'info',
        title: `Simulated (Dry-Run) ${intent.side}`,
        message: `${intent.side} ${quantity} ${intent.symbol} @ $${marketPrice.toFixed(2)} (~$${estimatedCost.toFixed(2)})${
          levels ? ` (TP: $${levels.takeProfit.toFixed(2)}, SL: $${levels.stopLoss.toFixed(2)})` : ''
        }`,
        symbol: intent.symbol,
      }).catch(() => {})

      return outcome('dry-run', reason, {
        quantity,
        price: marketPrice,
        notionalUsd: estimatedCost,
        realisedPnlUsd,
      })
    }

    const brokerParams = getBrokerOrderParams(exchange.id, settings.brokerId)
    const order = await exchange.createOrder(
      intent.symbol,
      'market',
      intent.side.toLowerCase(),
      quantity,
      undefined,
      brokerParams,
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

    void notifyImportantEvent({
      type: 'trade',
      level: 'success',
      title: `⚡ Live ${intent.side} Executed`,
      message: `${intent.side} ${filledQuantity} ${intent.symbol} @ $${fillPrice.toFixed(2)} ($${cost.toFixed(2)})${
        levels ? ` (TP: $${levels.takeProfit.toFixed(2)}, SL: $${levels.stopLoss.toFixed(2)})` : ''
      }`,
      symbol: intent.symbol,
      data: { orderId: order.id, fillPrice, filledQuantity, cost },
    }).catch(() => {})

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
 * Uses the Binance SDK directly as the authoritative source of truth for live position
 * and open orders, making execution completely independent of local database persistence.
 */
export async function runAutoTrade(
  previousAction: TradeAction | null,
  nextAction: TradeAction,
  signalId: number | null,
  levels?: TradeLevels | null,
  symbol: string = config.symbol,
): Promise<TradeOutcome | null> {
  const settings = getExchangeSettings()
  if (!isTradingArmed(settings)) return null

  const isDryRun = settings.dryRun
  let hasOpenPosition = false
  let openPositionSide: TradeSide | null = null

  if (!isDryRun) {
    let openBuy: StoredTradeOrder | null = null
    try {
      openBuy = getOpenBuyPosition(symbol)
    } catch {}

    if (openBuy) {
      // We have a recorded open position. Check with Binance if it's still open.
      try {
        const exchange = await getTradingExchange()
        const openOrders = await exchange.fetchOpenOrders(symbol, undefined, 5).catch(() => [])
        if (openOrders.length > 0) {
          // OCO bracket or working order is still live on exchange
          hasOpenPosition = true
          openPositionSide = 'BUY'
        } else {
          // No open orders on exchange. Check if our OCO/exit filled.
          const myTrades = await exchange.fetchMyTrades(symbol, undefined, 5).catch(() => [])
          const closingTrade = myTrades.find(
            (t) => t.side === 'sell' && t.timestamp && t.timestamp >= openBuy!.createdAt,
          )
          if (closingTrade) {
            // Position was closed on exchange (e.g. OCO hit TP or SL). Record closing order.
            const closingPrice = Number(closingTrade.price ?? 0)
            const closingQty = Number(closingTrade.amount ?? openBuy.quantity)
            const closingNotional = closingQty * closingPrice
            const pnl = openBuy.price ? (closingPrice - openBuy.price) * closingQty : null
            try {
              recordTradeOrder({
                symbol,
                side: 'SELL',
                type: 'oco-exit',
                quantity: closingQty,
                price: closingPrice,
                notionalUsd: closingNotional,
                status: 'placed',
                reason: `Binance native OCO bracket filled at $${closingPrice.toFixed(2)} (Trade #${closingTrade.id})`,
                environment: environmentLabel(settings),
                realisedPnlUsd: pnl,
                response: JSON.stringify(closingTrade),
                signalId,
              })
            } catch {}

            void notifyImportantEvent({
              type: 'trade',
              level: pnl && pnl >= 0 ? 'success' : 'warning',
              title: `🎯 Binance OCO Exit Filled (${pnl && pnl >= 0 ? 'Take-Profit' : 'Stop-Loss'})`,
              message: `Sold ${closingQty} ${symbol} @ $${closingPrice.toFixed(2)}${
                pnl != null ? ` (PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})` : ''
              }`,
              symbol,
              data: { pnl, closingPrice, closingQty },
            }).catch(() => {})

            hasOpenPosition = false
            openPositionSide = null
          } else {
            // No closing trade found yet, position still open
            hasOpenPosition = true
            openPositionSide = 'BUY'
          }
        }
      } catch (err) {
        console.warn('[trader] Could not query Binance orders, relying on DB position:', err)
        hasOpenPosition = true
        openPositionSide = 'BUY'
      }
    } else {
      // DB has no open position for this symbol.
      // Verify whether Binance has any open orders for this symbol placed by our bot.
      try {
        const exchange = await getTradingExchange()
        const openOrders = await exchange.fetchOpenOrders(symbol, undefined, 5).catch(() => [])
        hasOpenPosition = openOrders.length > 0
        openPositionSide = hasOpenPosition ? 'BUY' : null
      } catch {
        hasOpenPosition = false
        openPositionSide = null
      }
    }
  } else {
    // In dry-run mode: check in-memory cache first, then fallback to DB
    const memPos = inMemoryDryRunPositions.get(symbol)
    if (memPos) {
      hasOpenPosition = true
      openPositionSide = memPos.side
    } else {
      let openDry = null
      try {
        openDry = getOpenDryRunPosition(symbol)
      } catch {}
      hasOpenPosition = openDry !== null
      openPositionSide = openDry?.side ?? null
    }
  }

  // In stateless environments (or after restarts), if Binance has NO open position
  // and the strategy generates a BUY signal, do not allow a stale DB previousAction to block entry.
  const effectivePrev =
    !hasOpenPosition && nextAction === 'BUY' && previousAction === 'BUY'
      ? 'STAY_OUT'
      : previousAction

  const intent = decideTrade(
    effectivePrev,
    nextAction,
    hasOpenPosition,
    settings.notionalUsd,
    symbol,
    isDryRun,
    openPositionSide,
  )

  if (!intent) return null
  return executeTrade(intent, signalId, levels)
}
