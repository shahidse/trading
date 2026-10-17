# Strategy, Capital Allocation & Risk Management Guide

This document defines the trading strategies, capital allocation rules, position-sizing formulas, and multi-tier exit mechanics for Ethereum (`ETH/USDT`) within the `eth-signal-app` ecosystem.

---

## 1. Master Strategy Taxonomy

The application supports and categorizes strategies into specific market regime archetypes:

| Strategy | Market Regime | Trigger / Entry Signal | Invalidation / Exit |
| :--- | :--- | :--- | :--- |
| **Trend Following (MAs)** | Strong Trend ($ADX \ge 25$) | EMA Stack: $\text{Price} > \text{EMA}_{20} > \text{EMA}_{50} > \text{EMA}_{200}$ | Fast EMA cross under Mid EMA |
| **Range Trading** | Sideways ($ADX \le 20$) | Buy at range support, sell at range resistance | Breakout beyond range boundary |
| **S/R Reversal** | Reversal at Key Levels | Rejection candle (Hammer / Engulfing) off major support ($2,400) | Candle close beyond the support level |
| **Wait for Confirmation** | Pullback in Trend | Price pulls back to 20 EMA or VWAP and prints a bullish reversal | Break below pullback swing low |
| **Liquidity Grab** | False Breakdown | Sweep of previous swing low followed by immediate re-acceptance | Failure to maintain reclaim level |
| **Breakout Trading** | Volatility Expansion | Price breaks resistance ($2,825) with $>1.5\times$ volume spike | Re-entry back into previous range |
| **DCA** | Long-Term Spot | Time-weighted fixed periodic spot accumulation | Portfolio rebalancing thresholds |
| **Swing Trading** | Multi-Day Expansion | 1h/4h macro trend alignment, holding for days/weeks | Trailing ATR stop loss |
| **Scalping** | 15m Micro Flips | Fast RSI/StochRSI oversold bounces ($1:1.5$ R:R quick targets) | Tight $1.5\times\text{ATR}$ stop |
| **Grid Trading** | High Volatility Churn | Systematic geometric limit orders across defined price bands | Breaching grid upper/lower boundaries |

---

## 2. Capital Allocation Architecture

### 2.1 Macro Portfolio Split
Institutional portfolio allocation guidelines:
- **Total Crypto Sleeve**: **$1\%$ to $5\%$** of total net worth (1% for beginners/risk aversion, up to 5% for growth).
- **Core Crypto Split**: **$70\%$ BTC / $30\%$ ETH** for optimal risk-adjusted Sharpe ratio.
  - *Example ($100k Total Portfolio at 5% Crypto Sleeve)*:
    - Total Crypto: $\$5,000$
    - Bitcoin: $\$3,500$ ($70\%$)
    - Ethereum: $\$1,500$ ($30\%$)

### 2.2 Account Risk Per Trade (1% – 2% Rule)
> **Golden Invariant**: Never risk more than **1% to 2%** of your total active trading account equity on any single trade.

$$\text{Max Risk USD} = \text{Account Equity} \times \text{Risk \%} \quad (\text{e.g. } \$10,000 \times 1\% = \$100)$$

### 2.3 Risk-Based Position Sizing Formula
Instead of arbitrary fixed order sizes, position size is dynamically derived from the distance to your stop-loss:

$$\text{Stop Distance \%} = \frac{|\text{Entry Price} - \text{Stop Loss Price}|}{\text{Entry Price}}$$

$$\text{Position Notional (USD)} = \frac{\text{Max Risk USD}}{\text{Stop Distance \%}}$$

$$\text{Position Quantity (ETH)} = \frac{\text{Position Notional}}{\text{Entry Price}}$$

#### Concrete Sizing Examples:
* **Account Balance**: $\$10,000$
* **Max Risk (1.5%)**: $\$150$

| Market Scenario | Entry Price | Stop Loss | Stop Distance % | Position Size ($) | Quantity (ETH) | Max Loss if Stopped |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tight Breakout** | $\$2,500$ | $\$2,450$ | $2.0\%$ | $\$7,500$ | $3.00$ ETH | $\$150$ |
| **Normal 15m ATR** | $\$2,500$ | $\$2,375$ | $5.0\%$ | $\$3,000$ | $1.20$ ETH | $\$150$ |
| **Wide Swing Stop** | $\$2,500$ | $\$2,125$ | $15.0\%$ | $\$1,000$ | $0.40$ ETH | $\$150$ |

*Note: Position sizes are always subject to the bot's hard cap (`MAX_NOTIONAL_USD`).*

---

## 3. Stop-Loss Framework (Capital Defense)

### 3.1 Stop-Loss Distances
1. **Normal Spot 15m Baseline**: **$5\%$ Stop-Loss** or $2.5\times\text{ATR}$ (whichever is more adaptive).
2. **Macro Swing Trading**: **$15\%$ to $20\%$ Stop-Loss** to accommodate Ethereum's structural market cycles without getting shaken out.
3. **Breakout / Liquidity Sweep**: Place the stop immediately below the breakout level or candle wick invalidation point.

### 3.2 Breakeven Ratchet Rule
- When the trade reaches **$1:1.5$ Risk-Reward** (Target 1), the stop-loss on the remaining position is **automatically moved to entry price (breakeven)**.
- This creates a **risk-free runner**.

---

## 4. Take-Profit & Scale-Out Execution

Avoid all-or-nothing exits. Lock in gains systematically while allowing winners to run.

### 4.1 Target Ratios
- **Minimum Target (TP1)**: **$1:1.5$ R:R**
- **Optimal Target (TP2)**: **$1:2.6$ R:R**

$$\text{TP}_1 = \text{Entry} + (1.5 \times \text{Stop Distance})$$
$$\text{TP}_2 = \text{Entry} + (2.6 \times \text{Stop Distance})$$

### 4.2 Scale-Out Execution Models

#### Model A: The 75 / 25 Runner Split
1. **At TP1 ($1:1.5$ R:R / Major Resistance)**: Sell **$75\%$** of the position to secure profit. Move stop to entry price.
2. **Remaining $25\%$**: Keep active with a **trailing ATR stop** to capture larger multi-day swings.

#### Model B: Staged 4-Tier Scale Out (25% Increments)
- **Target 1 ($1:1.5$ R)**: Sell $25\%$, move stop to breakeven.
- **Target 2 ($1:2.0$ R)**: Sell $25\%$, raise stop to TP1.
- **Target 3 ($1:2.6$ R)**: Sell $25\%$, raise stop to TP2.
- **Target 4 (Trailing Runner)**: Final $25\%$ trails until market structure breaks.

---

## 5. Ethereum Key Levels & Zones Reference

Keep these pivotal price zones mapped for support, resistance, and confluence checking:

| Zone Type | Price Levels | Significance | Strategy Action |
| :--- | :--- | :--- | :--- |
| **Pivotal Support** | **$\$2,400$** | High-volume liquidity baseline | Look for S/R reversal & liquidity sweeps |
| **Dynamic Support** | **$\$2,357 - \$2,370$** | 100-day EMA support cluster | Strong trend-following pullback entry |
| **Former Resistance** | **$\$2,600$** | Prior breakout point / psychological zone | Conservative TP1 take-profit zone |
| **Range Top** | **$\$2,808 - \$2,813$** | Multi-touch range ceiling | Range Trading sell / TP2 zone |
| **Macro Breakout** | **$\$2,825$** | Key structural resistance | Breakout trading trigger with volume spike |
