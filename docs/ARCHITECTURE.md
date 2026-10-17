# Technical Architecture — ETH Signal & Trading System

## 1. High-Level Architecture Overview

The system operates as an integrated end-to-end algorithmic pipeline that combines on-chain and off-chain data sources, technical indicator synthesis, risk-controlled trade plan generation, multi-channel alerting, and guarded exchange execution.

```mermaid
flowchart TD
    subgraph Data Layer
        B[Binance Spot API] -->|ETH/USDT 15m Candles| AGG[lib/data/aggregate.ts]
        C[Chainlink ETH/USD Feed] -->|On-Chain Oracle Price| AGG
    end

    subgraph Signal Processing Engine
        AGG -->|Market Snapshot| IND[lib/indicators/]
        IND -->|Trend / Mean-Rev / Context| SCORE[lib/signal/scoring.ts]
        ADX[ADX 14 Regime Filter] -->|Dynamic Weights Tilt| SCORE
        ATR[ATR 14 Volatility Engine] -->|Adaptive Threshold Multiplier| SCORE
        CONF[Confluence Evaluator] -->|Boost / Dampen Multiplier| SCORE
        SCORE -->|Composite [-100, +100]| PLAN[lib/signal/plan.ts]
        PLAN -->|Action: BUY / HOLD / SELL / STAY_OUT| ENG[lib/signal/engine.ts]
    end

    subgraph Storage & Side Effects
        ENG -->|Signal Record| PIPE[lib/pipeline.ts]
        PIPE -->|Persist Signal| DB[(SQLite: signals.db)]
        PIPE -->|Check Guards & Execute| EXCH[lib/exchange/trader.ts]
        EXCH -->|Orders & Dry-Run Logs| DB
        PIPE -->|Notify on Action / Direction Flip| NOTIFY[lib/notify/]
        NOTIFY -->|Email via Resend| RESEND[Resend API]
        NOTIFY -->|Alert via Telegram| TELEGRAM[Telegram Bot API]
    end

    subgraph User Interface & Diagnostics
        DB -->|Query History & Metrics| NEXT[Next.js 15 App Router]
        NEXT -->|Interactive Charts & Markers| UI[Dashboard UI /settings]
        CLI[Scripts: analyze-once, backtest, scheduler] -->|Orchestrate| PIPE
    end
```

---

## 2. Core Modules Breakdown

### 2.1 Data Ingestion (`lib/data/`)
- **`binance.ts`**: Fetches historical OHLCV 15-minute candlesticks using `ccxt`. Supports pagination past the exchange's 1000-candle boundary for extensive backtesting.
- **`chainlink.ts`**: Connects via `viem` to the mainnet Ethereum Aggregator proxy (`0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`) to verify the decentralized spot reference price.
- **`aggregate.ts`**: Merges exchange candlesticks with the oracle reading, calculating the percentage divergence between exchange and oracle prices.

### 2.2 Indicator Engine (`lib/indicators/`)
The engine computes 9 directional scoring indicators and 2 contextual regime indicators:

| Category | Indicator | Base Weight | Logic |
| :--- | :--- | :--- | :--- |
| **Trend** | Ichimoku Cloud (9/26/52) | 15% | Price relative to cloud, Tenkan-sen / Kijun-sen cross, Senkou Span A/B |
| **Trend** | MACD (12/26/9) | 13% | Histogram sign, MACD vs Signal line cross, zero-line position |
| **Trend** | EMA Trend (20/50/200) | 12% | Bullish stack (Price > EMA20 > EMA50 > EMA200) vs Bearish stack |
| **Mean-Rev** | Bollinger Bands (20, 2σ) | 10% | Percent-B score; zeroed out in 0.2–0.8 neutral band |
| **Mean-Rev** | RSI (14) | 10% | Oversold (<30) vs Overbought (>70); zeroed in 40–60 neutral band |
| **Mean-Rev** | Stochastic RSI (14, 3, 3) | 8% | Fast oscillator %K and %D thresholds (<20 oversold, >80 overbought) |
| **Mean-Rev** | VWAP (Rolling 24h / 96 bars) | 10% | Deviation from 24h volume-weighted average price |
| **Context** | Volume & OBV (20) | 12% | On-Balance Volume trend and volume spike confirmation |
| **Context** | Candlestick Patterns | 10% | Multi-candle recognition: Engulfing, Hammer, Morning/Evening Star, Soldiers/Crows |
| **Regime** | ADX (14) | *(Filter)* | Measures trend strength ($ADX \ge 25$ = Trending; $ADX \le 20$ = Ranging) |
| **Volatility**| ATR (14) | *(Filter)* | Scales decision threshold ($\times 0.8$ to $\times 1.4$) & sets stop-loss distances |

### 2.3 Scoring & Regime Tilt (`lib/signal/scoring.ts`)
1. **Regime Weight Tilting**:
   - In a trending regime ($ADX \ge 25$), trend indicators receive a $\times 1.5$ multiplier while mean-reversion indicators are dampened by $\times 0.5$.
   - In a ranging regime ($ADX \le 20$), trend indicators are dampened by $\times 0.6$ while mean-reversion indicators are boosted by $\times 1.4$.
   - Weights are renormalised across active indicators to sum to $1.0$.
2. **Confluence Filter**:
   - $\ge 5$ agreeing indicators: Composite multiplied by $\times 1.15$.
   - $\ge 3$ conflicting indicators on each side: Composite dampened by $\times 0.70$.
3. **Threshold Calculation**:
   - Base thresholds ($\pm 25$) are scaled by the volatility ratio ($ATR / ATR_{median}$) clamped to $[0.8, 1.4]$.

### 2.4 Trade Plan Machine (`lib/signal/plan.ts`)
Translates signal state into concrete spot actions:
- `BUY`: Opened when composite score $\ge \text{adaptiveThreshold}$ and passes the trend gate. Levels computed:
  - $\text{Entry} = \text{Current Price}$
  - $\text{Stop Loss} = \text{Entry} - (2.5 \times \text{ATR})$
  - $\text{Take Profit} = \text{Entry} + (2 \times \text{StopDistance})$
- `HOLD`: Maintained while bullish structure remains intact and exit conditions are not met.
- `SELL`: Emitted on bearish divergence or stop breach to exit spot holdings.
- `STAY_OUT`: Emitted when in the neutral zone or if the trend gate blocks a counter-trend buy.

### 2.5 Automated Trader & Risk Guards (`lib/exchange/`)
Strict separation of concerns prevents unintended financial execution:
- **`decideTrade()`**: Pure function mapping previous and next plan action to order intent.
- **`checkGuards()`**: Pure function enforcing:
  - Kill Switch off
  - Trading enabled
  - API credentials present
  - Notional USD $\le \text{Max Notional Cap}$
  - Rolling 24h Realized PnL $> -\text{Daily Loss Limit}$
- **`executeTrade()`**: Performs the actual CCXT order placement (or simulates in dry-run/testnet mode) and records an immutable log to `trade_orders`.

---

## 3. Database Schema (`signals.db`)

Managed via **Drizzle ORM** with SQLite (`better-sqlite3`):

### `signals`
Stores every analysis run for historical analysis, dashboard rendering, and backtesting comparison:
- `id` (Primary Key, Auto-increment)
- `createdAt` (Unix timestamp ms)
- `symbol`, `timeframe`, `direction` ('LONG' | 'SHORT' | 'NEUTRAL')
- `score`, `confidence`, `price`, `chainlinkPrice`, `divergencePct`
- `indicators` (JSON serialized breakdown)
- `reasons` (JSON array of rationale strings)
- `regime`, `confluence`, `thresholds`, `plan` (JSON serialized metadata)
- `emailed` (Integer flag 0 or 1)

### `settings`
Key-value runtime configuration table. Overrides `.env.local` without requiring server restarts:
- `key` (Text, Primary Key: e.g. `'notify'`, `'exchange'`)
- `value` (JSON string)
- `updatedAt` (Unix timestamp ms)

### `trade_orders`
Audit log of every order attempted by the bot:
- `id` (Primary Key, Auto-increment)
- `createdAt` (Unix timestamp ms)
- `symbol`, `side` ('BUY' | 'SELL'), `type` ('market'), `quantity`, `price`, `notionalUsd`
- `status` ('placed' | 'dry-run' | 'refused' | 'error' | 'skipped')
- `reason` (Detailed refusal or execution description)
- `environment` ('testnet' | 'live' | 'dry-run')
- `realisedPnlUsd` (Calculated upon position exit)
- `response` (JSON raw exchange response)
- `signalId` (Foreign reference to `signals.id`)

---

## 4. Smart Contracts (`contracts/`)

Optional on-chain verification layer compiled with Hardhat:

1. **`SignalRegistry.sol`**:
   - Append-only on-chain log of generated signals.
   - Provides cryptographic, timestamped proof of signals without running indicator math on-chain.
   - Emits `SignalPublished(id, direction, score, priceE8, metadataUri)`.
2. **`EthPriceConsumer.sol`**:
   - On-chain consumer for the Chainlink ETH/USD aggregator.
   - Includes staleness checks (`block.timestamp - updated > maxStaleness`).
