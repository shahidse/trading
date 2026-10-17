# AGENTS.md — ETH Signal & Trading Automation Guide

> **Target Workspace**: `eth-signal-app` (Ethereum Spot 15m Signal Engine & Execution Bot)  
> **Repository Root**: `/home/shahid/Documents/WorkSpace/blockchain`  
> **Node Runtime**: Node.js v22+ (`export PATH="/home/shahid/.nvm/versions/node/v22.12.0/bin:$PATH"`)  
> **Primary Technology Stack**: Next.js 15 (App Router), TypeScript 5.7, Tailwind CSS v4, Drizzle ORM + SQLite (`better-sqlite3`), CCXT (Binance Spot), Viem / Wagmi, Lightweight Charts, Resend, Telegram Bot API, Vitest, Hardhat.

---

## 1. Project Overview & Philosophy

`eth-signal-app` is a local-first, highly disciplined algorithmic trading and signal generation system for **Ethereum spot trading on a 15-minute timeframe**.

### Core Philosophy
1. **Risk Control Over Prediction**: Multi-indicator analysis does not guarantee edge on 15m noise; rather, it provides systematic risk bounds (dynamic ATR-based stop-losses, 2R profit targets, and confluence filtering).
2. **Safe by Default (Three Layers of Defense)**: Automatic trading defaults to **disabled**, with **dry-run ON** and **testnet ON**. Orders are only sent when deliberately armed.
3. **Pure Logic Before Network**: Indicator calculations, signal decisions, trade transitions, and safety guards are pure, side-effect-free functions thoroughly covered by unit tests before reaching I/O or network layers.
4. **Zero-Withdrawal Constraint**: The application asserts that exchange API credentials **cannot withdraw funds**. If withdrawal permissions are detected, the bot halts immediately.
5. **Separation of Position**: The bot only sells what it opened. It never touches pre-existing ETH or wallet assets not tracked in `trade_orders`.

---

## 2. Command Cheat Sheet

Always ensure the Node 22 environment is in `PATH`:
```bash
export PATH="/home/shahid/.nvm/versions/node/v22.12.0/bin:$PATH"
```

| Action | Command | Purpose |
| :--- | :--- | :--- |
| **Run Unit Tests** | `npm test` | Runs 100+ Vitest tests covering indicators, scoring, guards, plans, notifications |
| **Watch Tests** | `npm run test:watch` | Interactive TDD test runner |
| **Typecheck** | `npm run typecheck` | Validates TypeScript with `tsc --noEmit` without generating JS |
| **One-Shot Analysis** | `npm run analyze` | Fetches live candles, runs indicators, persists signal, logs action |
| **Backtester** | `npm run backtest` | Replays strategy over historical candles (paginated > 1000 bars) |
| **Scheduler** | `npm run scheduler` | Starts continuous 15-minute cron runner (`*/15 * * * *`) |
| **Exchange Diagnostic** | `npm run check-exchange` | Read-only check for Binance keys, permissions, balances, and guards (zero orders) |
| **Oracle Diagnostic** | `npm run check-oracle` | Reads on-chain Chainlink ETH/USD aggregator via Viem |
| **Telegram Check** | `npm run check-telegram` | Validates Telegram Bot API token & target chat ID |
| **Web Dashboard** | `npm run dev` | Starts Next.js app at `http://localhost:3000` with live chart & `/settings` |
| **Database Migrations**| `npm run db:push` | Pushes Drizzle schema changes to `data/signals.db` |
| **Hardhat Contracts** | `npm run contracts:install`<br>`npm run contracts:test` | Hardhat smart contract tests in `contracts/` |

---

## 3. Directory & File Map

```
blockchain/
├── AGENTS.md                  # Single source of truth for AI agents (this file)
├── .agents/
│   └── rules/
│       └── trading-safety.md  # Critical financial safety and guard invariants
├── app/                       # Next.js App Router
│   ├── api/                   # API routes (/analyze, /price, /signals, /chart, /settings, /trades)
│   ├── settings/              # Runtime UI for alerts, triggers, and Binance API config
│   ├── page.tsx               # Primary live trading dashboard & chart
│   └── globals.css            # Tailwind styling tokens
├── components/                # React UI: SignalCard, IndicatorPanel, TVChart, WalletConnect
├── contracts/                 # Optional On-chain Hardhat Project
│   ├── contracts/
│   │   ├── SignalRegistry.sol # Immutable on-chain log of off-chain signals
│   │   └── EthPriceConsumer.sol # Chainlink price consumer with staleness validation
│   └── test/                  # Hardhat contract tests
├── data/                      # Local SQLite persistence (signals.db)
├── docs/                      # Technical plans, architecture diagrams, runbooks
├── lib/
│   ├── backtest/              # Historical candle replay & metrics engine
│   ├── config.ts              # Defaults, thresholds, and environment variable bindings
│   ├── data/
│   │   ├── binance.ts         # CCXT klines pagination and ticker fetching
│   │   ├── chainlink.ts       # Viem on-chain oracle reader
│   │   └── aggregate.ts       # Combines exchange candles + oracle price + divergence
│   ├── db/
│   │   ├── schema.ts          # Drizzle tables: signals, settings, trade_orders
│   │   └── client.ts          # DB query & persistence functions
│   ├── exchange/
│   │   ├── allocation.ts      # Pure risk-based sizing, 1-2% risk, staged take-profits (1.5R, 2.6R)
│   │   ├── client.ts          # CCXT exchange instantiation, permissions, precision
│   │   ├── settings.ts        # Runtime exchange credentials & limits
│   │   └── trader.ts          # pure decideTrade() -> pure checkGuards() -> executeTrade()
│   ├── indicators/            # 9 Directional + 2 Context indicators:
│   │   ├── ichimoku.ts        # Conversion, Base, Span A/B (15%)
│   │   ├── macd.ts            # Fast 12, Slow 26, Signal 9 (13%)
│   │   ├── ema-trend.ts       # EMA 20, 50, 200 stack (12%)
│   │   ├── bollinger.ts       # 20-period 2-stddev mean reversion (10%)
│   │   ├── rsi.ts             # 14-period RSI (10%)
│   │   ├── stoch-rsi.ts       # Stochastic RSI (8%)
│   │   ├── vwap.ts            # Rolling 24h VWAP (10%)
│   │   ├── volume.ts          # OBV & Volume spikes (12%)
│   │   ├── patterns.ts        # Engulfing, Hammer, Morning/Evening Star (10%)
│   │   ├── adx.ts             # 14-period ADX regime filter (weights tilt)
│   │   ├── atr.ts             # 14-period ATR volatility adaptive multiplier
│   │   └── series.ts          # Chart overlay data series builder
│   ├── notify/
│   │   ├── resend.ts          # HTML email template and Resend API dispatcher
│   │   ├── telegram.ts        # Markdown Telegram Bot API dispatcher
│   │   └── settings.ts        # Runtime alert settings resolver (DB > env > fallback)
│   ├── pipeline.ts            # Orchestrator: Data -> Signal -> DB -> AutoTrade -> Notify
│   ├── signal/
│   │   ├── scoring.ts         # Weights tilt, confluence multiplier, composite score
│   │   ├── plan.ts            # Action machine (BUY/HOLD/SELL/STAY_OUT) & ATR levels
│   │   └── engine.ts          # Full Signal synthesis
│   └── types.ts               # Shared TypeScript domain contracts
├── scripts/                   # CLI runners (analyze-once, scheduler, backtest, check-*)
└── tests/                     # 100+ Vitest unit and integration suites
```

---

## 4. Signal & Mathematical Architecture

### 4.1 Indicator Scoring Matrix
Directional indicators score within `[-100, +100]`. Raw weights:
- **Trend Group**: Ichimoku (15%), MACD (13%), EMA Trend (12%)
- **Mean Reversion Group**: Bollinger Bands (10%), RSI (10%), StochRSI (8%), VWAP (10%)
- **Context Group**: Volume / OBV (12%), Candlestick Patterns (10%)

### 4.2 Dynamic Regime Tilt (ADX 14)
ADX does **not** contribute to the score; it dynamically alters weights:
- **Strong Trend (`ADX >= 25`)**: Trend weights $\times 1.5$, Mean-Reversion weights $\times 0.5$.
- **Ranging Market (`ADX <= 20`)**: Trend weights $\times 0.6$, Mean-Reversion weights $\times 1.4$.
- *Weights are automatically renormalised to sum to 1.0*.

### 4.3 Confluence Analysis
- **Strong Agreement ($\ge 5$ indicators agree)**: Boost composite score by $\times 1.15$.
- **Conflict ($\ge 3$ indicators bullish AND $\ge 3$ bearish)**: Dampen composite score by $\times 0.70$.

### 4.4 ATR Volatility Adaptive Thresholds
The base decision thresholds are `LONG: +25` and `SHORT: -25`.
- Scaled dynamically by the ATR ratio between $\times 0.8$ (low volatility) and $\times 1.4$ (choppy conditions).

### 4.5 Trade Plan State Machine
`lib/signal/plan.ts` translates raw directional scores into concrete spot actions:
```
                      ┌─────────────────────────────────┐
                      │            STAY_OUT             │
                      │  (No edge or blocked by trend)  │
                      └───────▲─────────────────▲───────┘
                              │                 │
                      Bearish │                 │ Neutral / Exit
                      score   │                 │
                              │                 │
                      ┌───────┴──────┐   ┌──────┴──────┐
                      │     SELL     │   │     BUY     │◄── Bullish score
                      │ (Exit spot)  │   │(Enter spot) │    passes trend gate
                      └───────▲──────┘   └──────┬──────┘
                              │                 │
                              │      HOLD       │
                              └───────▲─────────┘
                                      │
                               Ongoing bullish
                                 confirmation
```
- **BUY Levels**:
  - Entry: Current market close.
  - Stop Loss: $\text{Entry} - (2.5 \times \text{ATR})$.
  - Take Profit: $\text{Entry} + (2 \times \text{StopDistance})$.
  - Risk:Reward: Always explicitly calculated (default 2R).

### 4.6 Strategy Matrix & Capital Allocation Architecture
Reference: [docs/STRATEGY_AND_ALLOCATION.md](file:///home/shahid/Documents/WorkSpace/blockchain/docs/STRATEGY_AND_ALLOCATION.md) and [lib/exchange/allocation.ts](file:///home/shahid/Documents/WorkSpace/blockchain/lib/exchange/allocation.ts)

1. **Strategy Archetypes Supported**:
   - **Trend Following**: 20/50/200 EMA stack in strong trend ($ADX \ge 25$).
   - **Range Trading**: Buy support ($2,400), sell resistance ($2,810) when $ADX \le 20$.
   - **S/R Reversal & Liquidity Grabs**: Sweep of support/resistance with immediate re-acceptance.
   - **Breakout Trading**: High volume expansion through $2,825 resistance.
   - **DCA & Swing Trading**: Systematic spot accumulation and multi-day macro trend riding.
2. **Capital Allocation Rules**:
   - **Institutional Crypto Sleeve**: $1\%$ to $5\%$ of total net worth ($70\%$ BTC / $30\%$ ETH split).
   - **Max Risk Per Trade**: **$1\%$ to $2\%$** of account equity.
   - **Dynamic Risk Sizing**: $\text{Notional USD} = \frac{\text{Account Equity} \times \text{Risk \%}}{\text{Stop Distance \%}}$, clamped to `maxNotionalUsd`.
3. **Multi-Tier Take-Profit & Stop Ratchet**:
   - **Target 1 (1:1.5 R:R)**: Scale out $75\%$ (or $25\%$ in 4-tier model); automatically ratchet stop to breakeven.
   - **Target 2 (1:2.6 R:R)**: Profit-taking at major resistance ($2,600 / $2,808-$2,825).
   - **Trailing Runner**: Let remaining $25\%$ run with trailing ATR stop.

---

## 5. Execution & Financial Safety Invariants

When modifying or interacting with `lib/exchange/`, `lib/pipeline.ts`, or settings:

1. **Pure Separation of Execution**:
   - `decideTrade()` determines *intent* without network I/O.
   - `checkGuards()` checks *preconditions* without network I/O.
   - `executeTrade()` is the **only** function permitted to make signed write requests to the exchange.
2. **The 7 Mandatory Pre-Order Guards**:
   1. `killSwitch === false` (Master emergency halt).
   2. `enabled === true` (Explicit arming in settings).
   3. `apiKey` and `secret` are non-empty.
   4. `notionalUsd > 0` and is finite.
   5. `notionalUsd <= maxNotionalUsd` (Hard per-order ceiling).
   6. `realisedPnl24h > -dailyLossLimitUsd` (Rolling 24h loss ceiling).
   7. `tradesCount24h < maxDailyTrades` (Rolling 24h trade count ceiling, default 5 trades/day).
3. **Native Binance OCO Bracket Orders**:
   - When a `BUY` order fills, if `useOcoBracket` is enabled, the bot places an immediate native **Binance OCO order** on Binance's order book (Upper limit take-profit leg + lower stop-loss limit leg). If one leg fills, Binance automatically cancels the other.
4. **Withdrawal Permission Ban**:
   - On mainnet, `assertWithdrawalsDisabled()` queries the API key permissions. If withdrawals are enabled or permissions cannot be verified, the bot **must fail closed**.
5. **Never Touch External Portfolio**:
   - A `SELL` is **only** placed if an open `BUY` was previously executed and recorded by this application in the `trade_orders` table. Unrelated spot balances in the Binance account must never be liquidated.
5. **Secrets & Settings Handling**:
   - Secrets (`BINANCE_SECRET`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`) must never be leaked to the browser via API responses. API responses return boolean flags (`configured: true/false`).
   - Saving an empty string in `/settings` clears the setting; sending undefined/masked keeps the existing value.

---

## 6. Coding & Testing Guidelines for AI Agents

1. **Always Verify with Tests**:
   - Run `npm test` after any change to `lib/` or `app/api/`. Ensure all 100 tests pass.
   - If adding a new indicator or modifying scoring, add corresponding test cases in `tests/`.
2. **Deterministic Time & Rounding**:
   - Candle times are Unix milliseconds (`number`).
   - Exchange order sizes must use `normaliseQuantity()` to comply with Binance lot-size filters.
3. **TypeScript Strictness**:
   - Maintain 100% strict TypeScript typing. Do not introduce untyped `any`.
   - Run `npm run typecheck` (`tsc --noEmit`) to verify types.
4. **Resilient Network Calls**:
   - Chainlink reads must handle public RPC rate limits gracefully and fall back to exchange price if stale.
   - External API errors (Binance, Resend, Telegram) must be logged and handled without crashing the scheduled runner.
