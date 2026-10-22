# Operational Runbook — ETH Signal & Trading App

This runbook covers day-to-day operations, environment setup, diagnostic procedures, live deployment, and emergency response.

---

## 1. Prerequisites & Environment Setup

Ensure the Node 22 environment is exported in your active shell:
```bash
export PATH="/home/shahid/.nvm/versions/node/v22.12.0/bin:$PATH"
```

Copy the example environment configuration:
```bash
cp .env.local.example .env.local
```

### Essential `.env.local` Variables
```env
# Exchange & Timeframe
BINANCE_SYMBOL="ETH/USDT"
CANDLE_INTERVAL="15m"

# Chainlink On-Chain Oracle (Ethereum Mainnet)
ETH_RPC_URL="https://ethereum-rpc.publicnode.com"
CHAINLINK_ETH_USD_FEED="0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"

# Email Alerts (Resend) - Optional
RESEND_API_KEY=""
ALERT_EMAIL_FROM=""
ALERT_EMAIL_TO=""

# Telegram Alerts - Optional
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Exchange Automated Trading (Safe Defaults)
TRADING_ENABLED=false
TRADING_KILL_SWITCH=false
TRADING_DRY_RUN=true
EXCHANGE_TESTNET=true
BINANCE_API_KEY=""
BINANCE_SECRET=""
TRADE_NOTIONAL_USD=100
MAX_NOTIONAL_USD=100
DAILY_LOSS_LIMIT_USD=50
```

---

## 2. Operational Procedures & Verification

### Step 1: Verify the Test Suite
Ensure all 100+ tests pass before any execution:
```bash
npm test
```

### Step 2: Validate External Integrations

1. **Verify Chainlink RPC Connection**:
   ```bash
   npm run check-oracle
   ```
   *Expected output*: Latest round ID, price scaled to USD, and updated timestamp.
   *Troubleshooting*: If `eth.llamarpc.com` fails with Cloudflare SSL errors, switch to `ethereum-rpc.publicnode.com` or your Alchemy/Infura endpoint.

2. **Verify Telegram Notifications**:
   ```bash
   npm run check-telegram
   ```
   *Expected output*: Confirmation that a test alert message was sent to your chat ID.

3. **Verify Binance Exchange Credentials**:
   ```bash
   npm run check-exchange
   ```
   *Expected output*: Confirms connection, testnet vs live status, account balances, and verifies withdrawal permissions are disabled.

### Step 3: Run One Analysis Pass
To test the full analysis pipeline manually without starting a daemon:
```bash
npm run analyze
```
Outputs the active price, indicator scores, ADX regime, confluence result, adaptive thresholds, and calculated trade plan.

---

## 3. Running Continuous Operations

### Mode A: Web Dashboard (Development / Local Monitoring)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
- Real-time TradingView-style Lightweight Chart with overlays (Bollinger, EMA, VWAP, Ichimoku, RSI, MACD).
- Signal card displaying the current plan (`BUY`, `HOLD`, `SELL`, `STAY_OUT`).
- Visual indicator contribution breakdown.
- `/settings` portal to modify notification and trading settings on the fly without restarting.

### Mode B: Background Scheduler Daemon
To run the automated analysis every 15 minutes:
```bash
npm run scheduler
```
*Tip for Production*: Run under `pm2` or `systemd`:
```bash
pm2 start "npm run scheduler" --name eth-signal-scheduler
```

---

## 4. Emergency Procedures & Troubleshooting

### Emergency Kill Switch Activation
If market conditions become extreme or unexpected order behavior occurs:
1. **Via UI**: Navigate to `/settings` -> Automatic Trading -> Toggle **Kill switch ON** -> Save.
2. **Via SQLite directly**:
   ```bash
   sqlite3 data/signals.db "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('exchange', '{\"killSwitch\":true,\"enabled\":false}', strftime('%s','now')*1000);"
   ```
3. **Via Environment**: Set `TRADING_KILL_SWITCH=true` in `.env.local` and restart the process.

### Investigating Refused Orders
Check the audit log directly in SQLite:
```bash
sqlite3 data/signals.db "SELECT id, createdAt, side, notional_usd, status, reason FROM trade_orders ORDER BY id DESC LIMIT 10;"
```
Common refusal reasons:
- `Order $X exceeds the $Y hard cap`: Increase `MAX_NOTIONAL_USD` if deliberate.
- `Daily loss limit reached`: Realized losses in the last 24h hit `DAILY_LOSS_LIMIT_USD`. Wait for the 24h rolling window to clear or adjust limits.
- `API key has withdrawal permissions`: Safety constraint triggered. Recreate the Binance API key with Spot Trading ONLY, zero withdrawal access.
