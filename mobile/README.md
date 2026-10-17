# ETH Signal & Trading Mobile App (React Native / Expo)

A mobile trading companion for **ETH Signal**, designed for iOS and Android using Expo and TypeScript.

---

## 📱 Features

1. **Live ETH Dashboard**:
   - Real-time Binance ETH/USDT spot price and Chainlink ETH/USD decentralized oracle price with divergence monitoring.
   - Pull-to-refresh and automatic 30-second background polling.

2. **Interactive 15m Candlestick Chart**:
   - Native SVG 15-minute candlestick chart renderer with adaptive vertical scaling.
   - Overlays calculated trade levels: **Take Profit (2R)**, **Entry**, and **ATR-based Stop Loss**.

3. **Active Signal & Trade Plan**:
   - Signal direction badge (`LONG` / `SHORT` / `NEUTRAL`), composite score, confidence percentage.
   - Regime classification (ADX trending vs. ranging, ATR volatility ratio multiplier).
   - Confluence indicator agreement meter.
   - Actionable Trade Plan with explicit stop distance %, target distance %, and risk-to-reward ratio.
   - Strategy reasoning bullets.

4. **Multi-Indicator Breakdown (9 Factors)**:
   - Full weight and score breakdown across **Trend Group** (Ichimoku, MACD, EMA Trend), **Mean Reversion** (Bollinger Bands, RSI, StochRSI, VWAP), and **Context** (Volume/OBV, Candlestick Patterns).
   - Visual gauge bars for rapid visual confluence scanning.

5. **Financial Safety & Emergency Controls**:
   - Emergency **Kill Switch** (`halt` / `resume`) to immediately freeze bot execution.
   - **Arm / Disarm** auto-trader controls with explicit confirmations.
   - Live position monitor showing open ETH quantity, fill price, active bracket levels, and rolling 24h realised P&L.

6. **Full Settings & Configuration Modal**:
   - Change backend Next.js API server URL (works with localhost, Android emulator `10.0.2.2`, or LAN IP).
   - Toggle Dry-Run mode & Binance Testnet.
   - Configure per-trade notional USD, max notional ceiling, and 24h loss ceiling.
   - Configure Telegram Bot alerts and Resend Email alerts.

---

## 🚀 Getting Started

### 1. Start the Next.js Backend
Ensure your Next.js backend server is running in the project root:
```bash
npm run dev
```
*(By default runs on `http://localhost:3000`)*

### 2. Start the Mobile App
From the repository root:
```bash
npm run mobile:start
```
Or directly inside the `mobile/` directory:
```bash
cd mobile
npm start
```

### 3. Running on Devices / Emulators
- **Expo Go (Physical Device)**: Install the [Expo Go](https://expo.dev/client) app on your Android or iPhone. Scan the QR code displayed in your terminal. In the mobile app settings (⚙ Config), set the API URL to your computer's LAN IP (e.g. `http://192.168.x.x:3000`).
- **Android Emulator**: Run `npm run mobile:android` (automatically connects via `http://10.0.2.2:3000`).
- **iOS Simulator (macOS)**: Run `npm run mobile:ios`.
- **Web Preview**: Run `cd mobile && npm run web`.

---

## 🧪 Typecheck & Verification

Run type validation for the mobile app:
```bash
npm run mobile:typecheck
```
