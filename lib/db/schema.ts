import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Persisted signals. `indicators` and `reasons` are JSON-encoded strings. */
export const signals = sqliteTable('signals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at').notNull(),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(),
  direction: text('direction').notNull(),
  score: real('score').notNull(),
  confidence: real('confidence').notNull(),
  price: real('price').notNull(),
  chainlinkPrice: real('chainlink_price'),
  divergencePct: real('divergence_pct'),
  indicators: text('indicators').notNull(),
  reasons: text('reasons').notNull(),
  /** JSON blobs for the ADX/ATR regime and the confluence analysis. */
  regime: text('regime'),
  confluence: text('confluence'),
  thresholds: text('thresholds'),
  /** JSON blob for the actionable entry/stop/target plan. */
  plan: text('plan'),
  emailed: integer('emailed').notNull().default(0),
})

export type SignalRow = typeof signals.$inferSelect
export type NewSignalRow = typeof signals.$inferInsert

/**
 * Key/value store for runtime-editable settings.
 *
 * Notification configuration (channel modes, recipients, keys) is saved here by
 * the `/settings` page so it can change without editing `.env.local` or
 * restarting the process. Values are JSON-encoded by the caller.
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export type SettingRow = typeof settings.$inferSelect

/**
 * Audit log of every order the trader attempted.
 *
 * `status` records intent as well as outcome — `placed` | `dry-run` |
 * `refused` | `error` | `skipped` — so guard rejections are visible after the
 * fact instead of vanishing into a console line.
 */
export const tradeOrders = sqliteTable('trade_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at').notNull(),
  symbol: text('symbol').notNull(),
  /** 'BUY' | 'SELL' */
  side: text('side').notNull(),
  /** Order type, e.g. 'market'. */
  type: text('type').notNull(),
  quantity: real('quantity').notNull(),
  price: real('price'),
  notionalUsd: real('notional_usd').notNull(),
  /** 'placed' | 'dry-run' | 'refused' | 'error' | 'skipped' */
  status: text('status').notNull(),
  /** Why it was refused / skipped, or how it was executed. */
  reason: text('reason'),
  /** 'testnet' | 'live' | 'dry-run' */
  environment: text('environment').notNull(),
  /** Realised P&L in USD, set on the closing (SELL) order. */
  realisedPnlUsd: real('realised_pnl_usd'),
  /** Raw exchange response, JSON-encoded. */
  response: text('response'),
  /** The signal that triggered this order, when there was one. */
  signalId: integer('signal_id'),
})

export type TradeOrderRow = typeof tradeOrders.$inferSelect
export type NewTradeOrderRow = typeof tradeOrders.$inferInsert

/**
 * Historical net-worth snapshots for the assets progress chart.
 */
export const portfolioSnapshots = sqliteTable('portfolio_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at').notNull(),
  totalUsd: real('total_usd').notNull(),
  totalPkr: real('total_pkr').notNull(),
  pkrRate: real('pkr_rate').notNull(),
  /** JSON-encoded array of { asset, amount, usdValue, pkrValue, price } */
  assetsBreakdown: text('assets_breakdown').notNull(),
  environment: text('environment').notNull(),
})

export type PortfolioSnapshotRow = typeof portfolioSnapshots.$inferSelect
export type NewPortfolioSnapshotRow = typeof portfolioSnapshots.$inferInsert

/**
 * Event-driven application and trading notifications.
 */
export const appNotifications = sqliteTable('app_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at').notNull(),
  type: text('type').notNull(), // 'trade' | 'hot-coin' | 'risk' | 'signal' | 'system'
  level: text('level').notNull(), // 'info' | 'success' | 'warning' | 'error'
  title: text('title').notNull(),
  message: text('message').notNull(),
  symbol: text('symbol'),
  data: text('data'),
  read: integer('read').notNull().default(0),
})

export type AppNotificationRow = typeof appNotifications.$inferSelect
export type NewAppNotificationRow = typeof appNotifications.$inferInsert
