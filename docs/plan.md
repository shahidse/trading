# ETH 15m Multi-Indicator Signal App — Plan

Analyze the current state of Ethereum every 15 minutes, emit **LONG / SHORT / NEUTRAL**
signals for **spot trading**, show them on a live dashboard, and email on signal changes.

## Goal

A local-first Next.js + TypeScript application that:

1. Fetches ETHUSDT 15m candles from **Binance** (via `ccxt`).
2. Cross-checks the price against the **Chainlink ETH/USD** on-chain feed (via `viem`).
3. Computes **Bollinger Bands**, **RSI**, **Ichimoku Cloud**, and **candlestick patterns**.
4. Combines them into one weighted composite score → `LONG` / `SHORT` / `NEUTRAL`.
5. Persists every signal to SQLite (Drizzle ORM).
6. Renders a live dashboard (Next.js App Router) with a wallet connect (wagmi + viem).
7. Sends an **email via Resend** when the plan action changes (`BUY` / `SELL` / `STAY_OUT`).
8. Includes a **backtesting** module to validate the strategy on historical candles.

## Stack

| Concern            | Choice                                            |
| ------------------ | ------------------------------------------------- |
| Framework          | Next.js (App Router) + React + TypeScript         |
| Styling            | Tailwind CSS                                      |
| Indicators         | `technicalindicators` + custom candlestick module |
| Market data        | `ccxt` (Binance ETHUSDT spot)                     |
| On-chain price     | `viem` + Chainlink ETH/USD price feed             |
| Wallet             | `wagmi` + `viem` + `@tanstack/react-query`        |
| Persistence        | Drizzle ORM + SQLite (`better-sqlite3`)           |
| Email              | `resend`                                          |
| Charts             | `lightweight-charts`                              |
| Scheduling         | `node-cron` (local)                               |
| Contracts (opt.)   | Hardhat — `contracts/`                            |
| Tests              | Vitest                                            |

## Signal model

Weighted composite score in `[-100, +100]`:

| Indicator           | Weight | Bullish (+)                                   | Bearish (−)                                  |
| ------------------- | ------ | --------------------------------------------- | -------------------------------------------- |
| Ichimoku Cloud      | 30%    | Price above cloud, Tenkan > Kijun, bullish TK | Price below cloud, Tenkan < Kijun, bearish TK |
| Bollinger Bands 20/2| 25%    | Close below lower band (mean reversion)       | Close above upper band                        |
| RSI 14              | 25%    | RSI < 30, bullish divergence                  | RSI > 70, bearish divergence                  |
| Candlestick pattern | 20%    | Bullish engulfing, hammer, morning star, …    | Bearish engulfing, shooting star, evening star|

- Composite `confidence` = `|score|`.
- Thresholds (configurable): `score >= +25` → **LONG**, `score <= -25` → **SHORT**, else **NEUTRAL**.

> **Threshold tuning (measured):** the original ±35 default produced only 5 signals in
> 900 bars of real 15m data — the four indicators cancel each other out. Backtesting across
> thresholds on 1500 candles gave: ±35 → 5 signals, ±25 → 102, ±20 → 303, ±15 → 444.
> ±25 is the shipped default; re-tune with `npm run backtest`.
>
> Bollinger and RSI also had their **neutral zones zeroed out** (BB only scores outside
> percent-B 0.2–0.8, RSI only outside 40–60). Previously they emitted a permanent small
> bullish bias that cancelled the trend reading from Ichimoku.

> **Spot note:** on spot markets a "SHORT" signal cannot be executed directly. The UI
> labels the bearish side as **EXIT / AVOID LONG** by default. True shorts are reserved
> for a future futures module.

## Email policy

Send only on **plan-action change** (deduplicated against the last stored signal) to avoid
one email every 15 minutes.

> **Changed in v3:** the trigger was originally the raw direction. It is now the plan
action, so an alert mirrors what the plan actually tells you to do. A bullish direction
that the trend gate refuses stays `STAY_OUT` and no longer emails a misleading "LONG".
With no previous signal, only an actionable plan (`BUY` / `SELL`) alerts.

## Project layout

```
blockchain/
├─ docs/plan.md
├─ app/                      # Next.js App Router
│  ├─ layout.tsx, page.tsx, globals.css
│  └─ api/{signals,price,analyze,backtest}/route.ts
├─ components/               # SignalCard, IndicatorPanel, SignalHistory, WalletConnect
├─ lib/
│  ├─ config.ts, types.ts
│  ├─ data/{binance,chainlink,aggregate}.ts
│  ├─ indicators/{bollinger,rsi,ichimoku,patterns,index}.ts
│  ├─ signal/{scoring,engine}.ts
│  ├─ backtest/replay.ts
│  ├─ notify/resend.ts
│  └─ db/{schema,client}.ts
├─ scripts/{analyze-once,scheduler}.ts
├─ tests/
└─ contracts/                # Hardhat (optional, Phase 9)
```

## Phases

1. **Scaffold** — config files, dependencies.
2. **Data layer** — Binance klines + Chainlink read + aggregation.
3. **Indicator engine** — Bollinger, RSI, Ichimoku, candlestick patterns.
4. **Signal engine + persistence** — scoring, decision, SQLite schema.
5. **Dashboard + wallet** — signal card, indicator panel, history, wagmi connect.
6. **Notifications** — Resend email on plan-action change.
7. **Backtesting** — replay engine + metrics (win rate, PnL, drawdown).
8. **Scheduler** — `node-cron` every 15 minutes + one-shot script.
9. **Optional contracts** — `SignalRegistry.sol` + `EthPriceConsumer.sol` (Hardhat).

## Verification

1. Vitest unit tests for indicators against known reference values.
2. `scripts/analyze-once.ts` produces a well-formed persisted signal.
3. Backtest over ~1000 candles produces sane statistics.
4. Email fires once on a simulated direction flip, zero times on NEUTRAL→NEUTRAL.
5. Scheduler fires once locally; dashboard renders live + historical signals.
6. `next build` + `tsc --noEmit` pass clean.

## Open defaults (can be tuned)

- Short side labeled **EXIT / AVOID LONG** for spot.
- Email only on plan-action change (the action, not the raw direction).
- Threshold `±25` (ATR-scaled at runtime).
- The long-only backtest under-performs buy & hold on bearish samples — expected for a
  spot strategy that cannot short. Re-tune weights/thresholds before trusting signals.

## v2 — Expanded indicator set (2026-10-15)

Grew from 4 to 9 directional indicators, plus two contextual (non-scoring) ones:

| Group | Indicators | Base weight |
| ----- | ---------- | ----------- |
| trend | Ichimoku, MACD, EMA 20/50/200 | 15% / 13% / 12% |
| mean-reversion | Bollinger, RSI, Stochastic RSI, VWAP | 10% / 10% / 8% / 10% |
| context | Volume/OBV, candlestick patterns | 12% / 10% |
| *regime* | ADX (tilts weights, does not score) | — |
| *volatility* | ATR (scales the threshold ×0.8–×1.4) | — |

New scoring layers:

1. **ADX regime tilt** — trending: trend ×1.5 / mean-reversion ×0.5; ranging: the reverse.
2. **Confluence** — ≥5 agreeing indicators → ×1.15; ≥3 conflicting → ×0.7.
3. **ATR-adaptive threshold** — volatility raises or lowers the `±25` bar.

### Validation result (2000 × 15m candles, long-only spot)

| Threshold | Signals | Trades | Return | Buy & hold | Win rate | Max DD |
| --------- | ------- | ------ | ------ | ---------- | -------- | ------ |
| ±20 | 665 | 24 | −9.8% | −9.9% | 16.7% | 10.4% |
| ±25 | 391 | 18 | −10.4% | −9.9% | 22.2% | 11.7% |
| ±30 | 216 | 13 | −8.6% | −9.9% | 23.1% | 9.8% |
| ±35 | 93 | 8 | −5.4% | −9.8% | 0% | 6.8% |

**Conclusion: no demonstrated edge.** All configs match or trail buy & hold with poor win
rates. A previous 1000-candle run appeared much better (−4.0% vs −10.0%) and was sample luck —
which is why `fetchCandles` now paginates past Binance's 1000-bar cap.

## v3 — Actionable trade plan (2026-10-15)

Added `lib/signal/plan.ts`, which converts a signal into something actionable:

- `action`: `BUY` / `HOLD` / `SELL` / `STAY_OUT`, with separate guidance for a flat
  trader and an existing holder (the app cannot know your position).
- ATR-derived levels: **entry**, **stop loss** (`stopAtrMultiple` × ATR, default 2.5),
  **take profit** (`rewardMultiple` R, default 2), and reward:risk.
- A **protective stop** for holders even when no entry is advised.
- A **trend gate** refusing LONG entries when the trend group is confirmed bearish.

The backtester now models stops and targets properly (intrabar, stop checked before
target) and reports exit reasons plus gate rejections.

### Result: the plan does not create edge

2000 × 15m candles, long-only spot, 0.1% fee/side:

| Configuration | Trades | Return | Buy & hold | Win rate | PF |
| ------------- | ------ | ------ | ---------- | -------- | -- |
| Raw signal (no stops) | 18 | −10.4% | −9.6% | 22.2% | 0.11 |
| 2.5×ATR / 2R | 34 | −12.5% | −9.6% | 29.4% | 0.33 |
| 3×ATR / 2R | 28 | −12.0% | −9.6% | 25.0% | 0.27 |
| 1.5×ATR / 2R | 47 | −13.6% | −9.6% | 27.7% | 0.25 |
| 2.5×ATR / 3R | 29 | −16.4% | −9.6% | 13.8% | 0.10 |

Every configuration trails both the raw signal and buy & hold. A tight stop is worst
(32 stops vs 12 targets). Conclusion: the plan is a **risk-control device, not an
edge**.

### Result: the trend gate is redundant

The gate fired **0 times in 1790 bars** — including a broadened variant that also blocks
on ADX-confirmed downside pressure. Cause: the v2 ADX regime tilt (trend ×1.5,
mean-reversion ×0.5) already prevents counter-trend LONG composites, so the scenario the
gate was built to block no longer occurs. The earlier hypothesis — "mean-reversion
indicators buy dips in a downtrend" — was fixed by the regime tilt, not by the gate.

The gate is retained as a cheap safety net. **No further indicator or gate work is
proposed; the remaining gap is strategy design, not signal generation.**
