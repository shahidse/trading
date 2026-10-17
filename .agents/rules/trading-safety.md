# Rule: Trading & Financial Safety Invariants

> **Scope**: Applies to all changes touching `lib/exchange/`, `lib/pipeline.ts`, `contracts/`, `scripts/`, or environment variables relating to trading.

## 1. Zero-Unintended Execution
- Automatic trading MUST remain default-disabled (`TRADING_ENABLED=false`).
- Dry-run mode MUST default to enabled (`TRADING_DRY_RUN=true`).
- Exchange target MUST default to Binance Testnet (`EXCHANGE_TESTNET=true`).
- No script or background service should place live orders unless explicitly directed by the user with deliberate credentials.

## 2. The 3-Stage Pipeline Invariant
Any trading interaction must follow the strict 3-stage pipeline:
1. `decideTrade(previousAction, nextAction, hasOpenPosition, notionalUsd, symbol)` — **Pure function**. No side effects, no API calls.
2. `checkGuards({ settings, notionalUsd, realisedPnl24h, tradesCount24h })` — **Pure function**. Validates kill switch, max notional, daily loss limit, daily trades ceiling (default 5 trades/day), and credentials.
3. `executeTrade(intent, signalId, levels)` — The single point of contact with the CCXT exchange. Every attempt must record an audit entry in `trade_orders` (status: `placed` | `dry-run` | `refused` | `skipped` | `error`).
4. **Native Binance OCO Bracket**: On BUY orders, automatically attaches an OCO order (Take-Profit limit + Stop-Loss limit) directly to Binance's order book.

## 3. Position Isolation (Never Touch Unowned ETH)
- The application tracks its own positions via `getOpenBuyPosition(symbol)`.
- A `SELL` order must ONLY execute if the bot itself opened a `BUY` order recorded in `trade_orders`.
- The bot must NEVER liquidate ETH held from external purchases, staking, or manual trading on the account.

## 4. Withdrawal Security Check
- Before any live trading session on Binance mainnet, `assertWithdrawalsDisabled()` must run.
- If the API key has withdrawal permissions or permissions cannot be verified, execution must fail closed with a descriptive rejection.

## 5. Security & Secrets Hygiene
- Secrets (`BINANCE_SECRET`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, private keys) must never be returned in plain text via API endpoints or logged in console traces.
- Keep all `.env.local` or database credentials masked in UI components.
