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
