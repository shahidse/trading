import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { and, asc, desc, eq, gt, ne } from 'drizzle-orm'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { config } from '@/lib/config'
import type {
  ConfluenceInfo,
  IndicatorScore,
  RegimeInfo,
  Signal,
  SignalDirection,
  TradePlan,
} from '@/lib/types'
import * as schema from './schema'
import {
  settings as settingsTable,
  signals,
  tradeOrders,
  type SignalRow,
  type TradeOrderRow,
  type NewTradeOrderRow,
} from './schema'

type DB = BetterSQLite3Database<typeof schema>

export type StoredSignal = Signal & { id: number; emailed: boolean }

let db: DB | null = null

function resolveDbFile(url: string): string {
  // If explicitly provided via environment
  if (process.env.DATABASE_URL) {
    const raw = process.env.DATABASE_URL.startsWith('file:')
      ? process.env.DATABASE_URL.slice('file:'.length)
      : process.env.DATABASE_URL
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
  }

  // Detect serverless environments (Netlify, AWS Lambda, Vercel) where filesystem is read-only except /tmp
  const isServerless =
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.VERCEL)

  if (isServerless) {
    return path.join('/tmp', 'signals.db')
  }

  const raw = url.startsWith('file:') ? url.slice('file:'.length) : url
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
}

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS signals (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at       INTEGER NOT NULL,
  symbol           TEXT    NOT NULL,
  timeframe        TEXT    NOT NULL,
  direction        TEXT    NOT NULL,
  score            REAL    NOT NULL,
  confidence       REAL    NOT NULL,
  price            REAL    NOT NULL,
  chainlink_price  REAL,
  divergence_pct   REAL,
  indicators       TEXT    NOT NULL,
  reasons          TEXT    NOT NULL,
  regime           TEXT,
  confluence       TEXT,
  thresholds       TEXT,
  plan             TEXT,
  emailed          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals (created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trade_orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at       INTEGER NOT NULL,
  symbol           TEXT    NOT NULL,
  side             TEXT    NOT NULL,
  type             TEXT    NOT NULL,
  quantity         REAL    NOT NULL,
  price            REAL,
  notional_usd     REAL    NOT NULL,
  status           TEXT    NOT NULL,
  reason           TEXT,
  environment      TEXT    NOT NULL,
  realised_pnl_usd REAL,
  response         TEXT,
  signal_id        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_trade_orders_created_at ON trade_orders (created_at DESC);
`

/**
 * Add columns introduced after the first release, so an existing local
 * database keeps working instead of erroring on a missing column.
 */
function ensureColumns(sqlite: Database.Database): void {
  const existing = new Set(
    (sqlite.prepare('PRAGMA table_info(signals)').all() as { name: string }[]).map((r) => r.name),
  )
  const additions: [string, string][] = [
    ['regime', 'TEXT'],
    ['confluence', 'TEXT'],
    ['thresholds', 'TEXT'],
    ['plan', 'TEXT'],
  ]
  for (const [name, type] of additions) {
    if (!existing.has(name)) {
      sqlite.exec(`ALTER TABLE signals ADD COLUMN ${name} ${type}`)
    }
  }
}

/**
 * Lazily open (and initialise) the SQLite database.
 *
 * The table is created on first use so local development needs no migration
 * step. Use `drizzle-kit` later if you move to a versioned schema.
 */
export function getDb(): DB {
  if (db) return db

  const file = resolveDbFile(config.db.url)
  fs.mkdirSync(path.dirname(file), { recursive: true })

  const sqlite = new Database(file)
  try {
    sqlite.pragma('journal_mode = WAL')
  } catch {
    sqlite.pragma('journal_mode = DELETE')
  }
  sqlite.exec(CREATE_TABLE)
  ensureColumns(sqlite)

  db = drizzle(sqlite, { schema })
  return db
}

function toStored(row: SignalRow): StoredSignal {
  return {
    id: row.id,
    symbol: row.symbol,
    timeframe: row.timeframe,
    direction: row.direction as SignalDirection,
    score: row.score,
    confidence: row.confidence,
    price: row.price,
    chainlinkPrice: row.chainlinkPrice ?? null,
    divergencePct: row.divergencePct ?? null,
    timestamp: row.createdAt,
    // Rows written before the regime/confluence columns existed fall back to
    // a neutral placeholder rather than throwing.
    regime: row.regime
      ? (JSON.parse(row.regime) as RegimeInfo)
      : {
          adx: null,
          regime: 'unknown',
          direction: 'unknown',
          atrPct: null,
          atrValue: null,
          volatilityRatio: null,
          thresholdMultiplier: 1,
          tilt: 'neutral',
          detail: 'not recorded (legacy row)',
        },
    confluence: row.confluence
      ? (JSON.parse(row.confluence) as ConfluenceInfo)
      : {
          bullish: 0,
          bearish: 0,
          agreeing: 0,
          conflicting: 0,
          multiplier: 1,
          verdict: 'mixed',
          detail: 'not recorded (legacy row)',
        },
    thresholdsUsed: row.thresholds
      ? (JSON.parse(row.thresholds) as { long: number; short: number })
      : { long: config.thresholds.long, short: config.thresholds.short },
    plan: row.plan
      ? (JSON.parse(row.plan) as TradePlan)
      : {
          action: 'STAY_OUT',
          headline: 'No trade plan recorded (legacy row)',
          forFlat: '—',
          forHolder: '—',
          gate: 'no-edge',
          levels: null,
          protectiveStop: null,
          rationale: [],
        },
    indicators: JSON.parse(row.indicators) as IndicatorScore[],
    reasons: JSON.parse(row.reasons) as string[],
    emailed: row.emailed === 1,
  }
}

/** Persist a signal and return its row id. */
export function saveSignal(signal: Signal): number {
  const row = getDb()
    .insert(signals)
    .values({
      createdAt: signal.timestamp,
      symbol: signal.symbol,
      timeframe: signal.timeframe,
      direction: signal.direction,
      score: signal.score,
      confidence: signal.confidence,
      price: signal.price,
      chainlinkPrice: signal.chainlinkPrice,
      divergencePct: signal.divergencePct,
      indicators: JSON.stringify(signal.indicators),
      reasons: JSON.stringify(signal.reasons),
      regime: JSON.stringify(signal.regime),
      confluence: JSON.stringify(signal.confluence),
      thresholds: JSON.stringify(signal.thresholdsUsed),
      plan: JSON.stringify(signal.plan),
      emailed: 0,
    })
    .returning({ id: signals.id })
    .get()

  return row?.id ?? 0
}

export function getRecentSignals(limit = 50): StoredSignal[] {
  return getDb()
    .select()
    .from(signals)
    .orderBy(desc(signals.id))
    .limit(limit)
    .all()
    .map(toStored)
}

export function getLastSignal(): StoredSignal | null {
  const row = getDb().select().from(signals).orderBy(desc(signals.id)).limit(1).get()
  return row ? toStored(row) : null
}

export function markEmailed(id: number): void {
  getDb().update(signals).set({ emailed: 1 }).where(eq(signals.id, id)).run()
}

/** Read a settings value by key, or null when unset. */
export function getSetting(key: string): string | null {
  const row = getDb().select().from(settingsTable).where(eq(settingsTable.key, key)).get()
  return row?.value ?? null
}

/** Upsert a settings value. Values are strings; JSON-encode structured data. */
export function setSetting(key: string, value: string): void {
  const updatedAt = Date.now()
  getDb()
    .insert(settingsTable)
    .values({ key, value, updatedAt })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt } })
    .run()
}

/** A stored trade order. */
export type StoredTradeOrder = TradeOrderRow

/** Append an order attempt to the audit log and return its id. */
export function recordTradeOrder(order: Omit<NewTradeOrderRow, 'createdAt'>): number {
  const row = getDb()
    .insert(tradeOrders)
    .values({ ...order, createdAt: Date.now() })
    .returning({ id: tradeOrders.id })
    .get()

  return row?.id ?? 0
}

/** Most recent order attempts, newest first. */
export function getRecentTradeOrders(limit = 50): StoredTradeOrder[] {
  return getDb().select().from(tradeOrders).orderBy(desc(tradeOrders.id)).limit(limit).all()
}

/** Sum of realised P&L recorded at or after `since` (Unix ms). */
export function realisedPnlSince(since: number): number {
  const rows = getDb()
    .select({ pnl: tradeOrders.realisedPnlUsd })
    .from(tradeOrders)
    .where(gt(tradeOrders.createdAt, since))
    .all()

  return rows.reduce((sum, row) => sum + (row.pnl ?? 0), 0)
}

/** Number of buy trade entries placed (or dry-run simulated) since `since` (Unix ms). */
export function countTradesSince(since: number): number {
  const rows = getDb()
    .select({ id: tradeOrders.id })
    .from(tradeOrders)
    .where(
      and(
        gt(tradeOrders.createdAt, since),
        eq(tradeOrders.side, 'BUY'),
      ),
    )
    .all()

  return rows.length
}

/**
 * The position *we* opened and have not yet closed.
 *
 * Only orders with status `placed` count, so dry runs and refusals never look
 * like a live position. Used to size a SELL — the bot never sells ETH it did
 * not buy.
 */
export function getOpenBuyPosition(symbol: string): StoredTradeOrder | null {
  const db = getDb()

  const lastBuy = db
    .select()
    .from(tradeOrders)
    .where(
      and(
        eq(tradeOrders.symbol, symbol),
        eq(tradeOrders.side, 'BUY'),
        eq(tradeOrders.status, 'placed'),
      ),
    )
    .orderBy(desc(tradeOrders.id))
    .limit(1)
    .get()

  if (!lastBuy) return null

  const closingSell = db
    .select({ id: tradeOrders.id })
    .from(tradeOrders)
    .where(
      and(
        eq(tradeOrders.symbol, symbol),
        eq(tradeOrders.side, 'SELL'),
        eq(tradeOrders.status, 'placed'),
        gt(tradeOrders.id, lastBuy.id),
      ),
    )
    .limit(1)
    .get()

  return closingSell ? null : lastBuy
}

/**
 * The current simulated position in dry-run mode (BUY or SELL).
 * In dry-run mode, both long (BUY first) and short (SELL first) positions are tracked.
 */
export function getOpenDryRunPosition(
  symbol: string,
): { side: 'BUY' | 'SELL'; order: StoredTradeOrder } | null {
  const db = getDb()

  const orders = db
    .select()
    .from(tradeOrders)
    .where(
      and(
        eq(tradeOrders.symbol, symbol),
        eq(tradeOrders.status, 'dry-run'),
        ne(tradeOrders.type, 'oco'),
      ),
    )
    .orderBy(asc(tradeOrders.id))
    .all()

  let current: { side: 'BUY' | 'SELL'; order: StoredTradeOrder } | null = null

  for (const order of orders) {
    if (!current) {
      current = { side: order.side as 'BUY' | 'SELL', order }
    } else if (current.side !== order.side) {
      // Opposite side closes the position
      current = null
    } else {
      current = { side: order.side as 'BUY' | 'SELL', order }
    }
  }

  return current
}
