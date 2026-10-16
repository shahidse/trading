# ETH Signal — 15m multi-indicator signal generator

Analyzes the current state of Ethereum on a **15-minute** interval and emits **LONG / SHORT /
NEUTRAL** signals for **spot trading**, combining four independent techniques:

Nine directional indicators, each scored in `[-100, +100]` and weighted by group:

| Group | Indicator | Weight | Bullish (+) | Bearish (−) |
| --- | --- | --- | --- | --- |
| trend | **Ichimoku Cloud** (9/26/52) | 15% | Price above cloud, Tenkan > Kijun, fresh bullish TK cross | Price below cloud, Tenkan < Kijun, bearish cross |
| trend | **MACD** (12/26/9) | 13% | Positive histogram, MACD above zero, fresh bullish cross | Negative histogram, MACD below zero, bearish cross |
| trend | **EMA Trend** (20/50/200) | 12% | Price > EMA20 > EMA50 > EMA200 (bullish stack) | Price < EMA20 < EMA50 < EMA200 (bearish stack) |
| mean-rev | **Bollinger Bands** (20, 2σ) | 10% | Price at/below lower band | Price at/above upper band |
| mean-rev | **RSI** (14) | 10% | RSI < 30, bullish divergence | RSI > 70, bearish divergence |
| mean-rev | **Stochastic RSI** | 8% | %K < 20 | %K > 80 |
| mean-rev | **VWAP** (rolling 24h) | 10% | Price below VWAP | Price above VWAP |
| context | **Volume / OBV** | 12% | Price and OBV rising together, volume spikes | OBV diverging against price |
| context | **Candlestick patterns** | 10% | Engulfing, hammer, morning star, three white soldiers | Shooting star, evening star, three black crows |

Three layers then shape the composite:

1. **Regime filter (ADX 14)** — trend *strength*, not direction. It does not score; it
   reweights. In a confirmed trend (ADX ≥ 25) trend weights are ×1.5 and mean-reversion
   ×0.5; in a range (ADX ≤ 20) the reverse. This stops Bollinger/RSI fading a real trend.
2. **Confluence** — when ≥ 5 indicators lean the same way the composite is boosted ×1.15;
   when ≥ 3 lean each way it is dampened ×0.7.
3. **ATR-adaptive threshold** — the boundary is scaled ×0.8–×1.4 by volatility, so choppy
   conditions demand more conviction.

The composite lands in `[-100, +100]`; `>= +25` (scaled) is **LONG**, `<= -25` (scaled) is
**SHORT**, anything between is **NEUTRAL**.

Signals appear on a live dashboard, are stored in SQLite, and trigger an alert — an **email via
Resend** and/or a **Telegram message via the Bot API** — only when the plan action changes
(`BUY` → `STAY_OUT`, `BUY` → `SELL`, …). So you don't get an email every 15 minutes — and an
alert always matches what the plan tells you to do.

---

## What to actually do — the trade plan

Every signal carries a concrete plan, not just a direction:

| Action | Meaning |
| --- | --- |
| `BUY` | Enter long now — entry, stop and target are provided |
| `HOLD` | Already long — keep it, trail the stop |
| `SELL` | Exit the long now |
| `STAY_OUT` | Do not enter (no edge, or the trend gate refused) |

When the action is `BUY`, levels come from ATR so risk is explicit:

- **Entry** — current price
- **Stop loss** — entry − `stopAtrMultiple` × ATR (default **2.5×ATR**)
- **Take profit** — entry + stop distance × `rewardMultiple` (default **2R**)
- **Reward:risk** — shown on the card, in the email, and in the CLI output

Even when it does not say buy, the plan still reports a **protective stop** for an
existing position, plus separate guidance under *If you are flat* and *If you already
hold* — the dashboard cannot know your position, so it gives you both.

**Alerts fire on the plan action, not the raw direction.** One email per action change
(`BUY` → `STAY_OUT`, `BUY` → `SELL`, …). A LONG direction that the trend gate blocks stays
`STAY_OUT`, so it never produces a misleading "buy" alert. The email subject and banner
lead with the action.

### Measured: the trade plan does not improve P&L

2000 × 15m candles, long-only spot, 0.1% fee per side:

| Configuration | Trades | Return | Buy & hold | Win rate | Profit factor |
| --- | --- | --- | --- | --- | --- |
| Raw signal (no stops) | 18 | −10.4% | −9.6% | 22.2% | 0.11 |
| 2.5×ATR stop / 2R | 34 | −12.5% | −9.6% | 29.4% | 0.33 |
| 3×ATR stop / 2R | 28 | −12.0% | −9.6% | 25.0% | 0.27 |
| 1.5×ATR stop / 2R | 47 | −13.6% | −9.6% | 27.7% | 0.25 |
| 2.5×ATR stop / 3R | 29 | −16.4% | −9.6% | 13.8% | 0.10 |

Every configuration is **worse than both the raw signal and buy & hold**. The tight
1.5×ATR stop is the worst (32 stops vs 12 targets — 15m noise simply harvests it).
Stops convert one larger drawdown into a series of small, fee-paying losses.

Read this as **risk control, not edge**. The plan tells you where to put your stop and
what your reward:risk is; it does not make this signal profitable on this data.

### The trend gate never fires

**0 rejections across 1790 bars**, even after broadening it to include ADX-confirmed
downside pressure. That is a real, useful result: the **ADX regime tilt already solved
the problem the gate was designed for**. With trend weights ×1.5 and mean-reversion
×0.5 in a trend, a composite rarely reaches LONG while the trend group points down, so
there is no counter-trend buy left to block. The gate is kept as a free safety net.

---

## Quick start

```bash
npm install                 # install dependencies
cp .env.local.example .env.local   # then fill in the values you need
npm run analyze             # one analysis pass → prints the signal
npm run dev                 # dashboard at http://localhost:3000
```

### Make it recurring

```bash
npm run scheduler           # runs now, then every 15 minutes via node-cron
```

---

## Environment

Everything is optional — the app runs with sensible defaults. See `.env.local.example`.

| Variable | Purpose |
| --- | --- |
| `BINANCE_SYMBOL` / `CANDLE_INTERVAL` | Market and timeframe (default `ETH/USDT`, `15m`) |
| `ETH_RPC_URL` | Ethereum RPC for the Chainlink read |
| `CHAINLINK_ETH_USD_FEED` | Aggregator address (mainnet default built in) |
| `RESEND_API_KEY` / `ALERT_EMAIL_FROM` / `ALERT_EMAIL_TO` | Email alerts — **left blank, no email is sent** |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram alerts — **left blank, no message is sent**; verify with `npm run check-telegram` |
| `LONG_THRESHOLD` / `SHORT_THRESHOLD` | Signal sensitivity (default `25` / `-25`) |
| `EMAIL_NOTIFY_MODE` / `TELEGRAM_NOTIFY_MODE` | Trigger per channel (default `action-change`); overridden by the `/settings` page |
| `TRADING_ENABLED` / `TRADING_KILL_SWITCH` / `TRADING_DRY_RUN` | Automatic trading switches — all default to the safe side (off / off / dry-run on) |
| `EXCHANGE_TESTNET` | `true` (default) targets the Binance Spot Testnet |
| `TRADE_NOTIONAL_USD` / `MAX_NOTIONAL_USD` / `DAILY_LOSS_LIMIT_USD` | Order size, hard per-order cap, rolling 24h loss limit |
| `DATABASE_URL` | SQLite file (default `file:./data/signals.db`) |
| `CRON_SCHEDULE` | Scheduler cron (default `*/15 * * * *`) |

> **Note:** the widely-copied public endpoint `eth.llamarpc.com` currently fails with a
> Cloudflare 525 SSL error. The default is `ethereum-rpc.publicnode.com`. Verify with
> `npm run check-oracle`, and use Alchemy/Infura for anything beyond local use.

### Notifications

Both channels are configured from the **`/settings`** page (link in the dashboard header) and
stored in the local SQLite database, so they take effect immediately for the dashboard, the CLI
and the scheduler — no restart. Anything saved there overrides the matching `.env.local` value.
Secrets are never sent back to the browser: the inputs show a *saved* placeholder and only change
when you type a new value (or press **Clear**). Each card has a **Send test** button.

Each channel picks its own trigger:

| Mode | Fires when |
| --- | --- |
| `action-change` *(default)* | the plan action changes — `BUY` → `STAY_OUT`, `BUY` → `SELL`, … |
| `direction-change` | the signal direction flips — `LONG` / `SHORT` / `NEUTRAL` |
| `every` | on every analysis run, no dedupe |

With no previous signal, `action-change` alerts only on an actionable plan (`BUY` / `SELL`) and
`direction-change` only on a non-neutral reading, so a fresh `STAY_OUT`/`NEUTRAL` stays quiet.

If a channel is disabled, or its credentials are missing, it is silently skipped. Alert failures
are logged and never break the analysis run.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dashboard |
| `npm run analyze` | One analysis pass, pretty-printed |
| `npm run scheduler` | Local 15-minute cron |
| `npm run backtest [-- N]` | Replay the strategy on `N` candles (default 1000) |
| `npm run check-oracle` | Diagnose the Chainlink price feed |
| `npm run check-telegram` | Verify the Telegram bot token and send a test message |
| `npm run check-exchange` | Verify the Binance trading key, permissions and order sizing (never places an order) |
| `npm test` | Vitest suite (indicators, patterns, engine) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |

---

## Architecture

```
Binance (ccxt)  ─┐
                 ├─→ aggregate ─→ indicators ─→ scoring ─→ Signal ─→ SQLite
Chainlink (viem) ┘                                              ├─→ dashboard
                                                                └─→ Resend / Telegram (on change)
```

```
lib/
  data/        binance.ts (paginated) · chainlink.ts · aggregate.ts
  indicators/  ichimoku · macd · ema-trend · bollinger · rsi · stoch-rsi · vwap ·
               volume · patterns  (+ adx, atr = context, not scored)
  signal/      scoring.ts (weights, regime tilt, confluence) · engine.ts (decision)
  backtest/    replay.ts
  exchange/    settings.ts · client.ts (ccxt) · trader.ts (guards + orders)
  notify/      resend.ts · telegram.ts · settings.ts
  db/          schema.ts · client.ts
```

`generateSignal(candles)` is a **pure function**, which is why the backtester can reuse the
exact same logic that runs live.

### Theming (light / dark)

A theme toggle sits in every page header. The choice is stored in `localStorage`
(`eth-signal-theme`) and applied **before first paint** by an inline script in `app/layout.tsx`,
so there is no flash of the wrong theme. With nothing stored it follows the OS preference.

Colours are **semantic CSS variables** in `app/globals.css` (`--canvas`, `--ink`, `--muted`,
`--surface`, `--line`, `--up`, `--down`, …) exposed to Tailwind via `@theme inline`, giving
utilities like `bg-surface`, `text-muted`, `border-line`, `text-up`. Components never hardcode a
palette — adding a theme means editing one block. Interactive elements get `cursor: pointer` from
a base rule, since Tailwind v4 no longer sets it on buttons.

The chart is the one exception: `lightweight-charts` paints to a canvas and cannot read CSS
variables, so `components/CandleChart.tsx` keeps its own `PALETTES` map keyed by theme and rebuilds
when the theme changes.

### API routes

| Route | Method | Returns |
| --- | --- | --- |
| `/api/price` | GET | Binance price, Chainlink price, divergence |
| `/api/signals?limit=50` | GET | Stored signal history |
| `/api/analyze` | POST/GET | Runs the pipeline and persists the result |
| `/api/backtest?limit=1000` | GET | Backtest metrics |

---

## Automatic trading (optional, off by default)

The app can place **real market orders on Binance** when the plan action changes. It is off by
default and ships pointed at the **Spot Testnet**.

> **Read this before arming it.** The signal has **no demonstrated edge** (see *Tuning* below):
> every measured configuration matches or trails buy & hold, and profit factors are 0.11–0.33 —
> far below break-even. Automating execution does not add edge; it removes the human filter and
> places losing trades unattended every 15 minutes. Treat this as plumbing for a strategy you have
> already validated, not as a money printer.

### How an order happens

`runAnalysis()` calls `runAutoTrade()` after persisting the signal. Nothing is sent unless trading
is armed **and** every guard passes:

```
kill switch → enabled → credentials → hard cap → daily loss limit
            → withdrawal-permission check → balance → order
```

The decision (`decideTrade`) and the guards (`checkGuards`) are **pure functions**, unit-tested and
surfaced in the UI.

| Plan transition | Action |
| --- | --- |
| → `BUY` (from anything else) | open a position at the configured notional |
| → `SELL` while holding | close **the position we opened** (never your other ETH) |
| `HOLD` / `STAY_OUT` | nothing |

### Three layers, all defaulting to safe

| Layer | Default | Meaning |
| --- | --- | --- |
| `enabled` | **false** | master arm switch |
| `dryRun` | **true** | log the intended order, send nothing |
| `testnet` | **true** | Binance Spot Testnet, not mainnet |

Plus a **kill switch** (halts immediately, one click from the dashboard header), a **hard cap** per
order, a **rolling 24h realised-loss limit** that pauses trading, and a **refusal to trade on
mainnet** if the API key is permitted to withdraw funds.

Every attempt — placed, dry-run, refused, skipped or errored — is written to the `trade_orders`
audit table and listed on `/settings`. Nothing fails silently.

### Setup

1. Create a Binance key with **Spot Trading enabled** and **Withdrawals DISABLED**; IP-allowlist it.
2. Enter the key/secret on `/settings` (or in `.env.local`).
3. `npm run check-exchange` — verifies auth, permissions and what your order size would buy.
4. Leave **dry run on**, arm trading, and watch the audit log for a few signals.
5. Only then turn dry run off — and only against the testnet with testnet funds.

**On spot there is no short.** `SHORT` means "exit / avoid long"; the trader only ever sells what
it bought itself.

---

## Tuning — read this before trusting the signals

Weights and thresholds are **defaults, not gospel**. The honest headline: **the strategy has
not demonstrated an edge yet.** Measured on 2000 real 15m candles (long-only spot, 0.1% fee/side):

| Threshold | Signals | Trades | Return | Buy & hold | Win rate | Max DD |
| --- | --- | --- | --- | --- | --- | --- |
| ±20 | 665 | 24 | −9.8% | −9.9% | 16.7% | 10.4% |
| ±25 | 391 | 18 | −10.4% | −9.9% | 22.2% | 11.7% |
| ±30 | 216 | 13 | −8.6% | −9.9% | 23.1% | 9.8% |
| ±35 | 93 | 8 | −5.4% | −9.8% | 0% | 6.8% |

Every configuration roughly matches or under-performs buy & hold, and win rates are poor.
The better returns at high thresholds come from being *out of the market*, not from skill
(8 trades at ±35, none of them winners). An earlier 1000-candle run looked far better
(−4.0% vs −10.0%) — that was sample luck, which is exactly why `fetchCandles` now paginates
instead of silently capping at Binance's 1000-bar limit.

Two changes that fixed real *logic* bugs (and raised signal quality, though not yet the P&L):

1. **Zeroed neutral zones** — Bollinger only scores outside percent-B 0.2–0.8, RSI only outside
   40–60. Before this they awarded a permanent mild bias that cancelled Ichimoku's trend read.
2. **`±35` was far too strict** — with four indicators it fired 5 times in 900 bars.

The likely cause of the low win rate is that the four mean-reversion indicators buy every dip
in a downtrend. The obvious next step is a **trend-confirmation gate**: refuse LONG entries
against a confirmed bearish trend, and/or add an explicit stop-loss. That is a strategy change,
not an indicator addition, so it is deliberately left out — see `lib/signal/scoring.ts` where
the regime tilt lives, which is the natural place to add it.

Run `npm run backtest [-- N]` yourself, then change weights in `lib/config.ts` and thresholds
in `.env.local`. **Validate before relying on any of it.**

### Known limitations

- **Spot cannot short.** A SHORT signal means *exit / avoid going long*. True shorts need a
  futures module.
- The long-only backtest **under-performs buy & hold on bearish samples** — expected for a
  strategy that can only go long. `npm run backtest` reports both so you can compare.
- Public RPCs rate-limit. Use a dedicated provider for real use.
- The dashboard's wallet connect uses the **injected** connector only (no WalletConnect
  project ID required). `next.config.ts` stubs out the unused Base/Coinbase connector subtree
  the wagmi barrel pulls in; see the comment there before removing it.

---

## Optional on-chain layer (`contracts/`)

Separate package — install and run it independently:

```bash
npm --prefix contracts install
npm --prefix contracts run test              # unit tests
npm --prefix contracts run node              # local chain
npm --prefix contracts run deploy:local      # deploy both contracts
```

- **`SignalRegistry.sol`** — append-only on-chain log of signals (owner-only writes). Signals
  are computed off-chain; this gives each one a timestamped, tamper-evident proof.
- **`EthPriceConsumer.sol`** — reads the Chainlink ETH/USD feed on-chain with staleness checks.

Neither is required for the signal pipeline; add them only if you want on-chain provenance.

---

## Disclaimer

Automated technical analysis for research and education only. **Not financial advice.** Markets
carry risk of loss.
