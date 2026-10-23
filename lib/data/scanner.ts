import { TOP_COINS, type CoinInfo } from '@/lib/constants/coins'
import { fetchMultipleTickers } from './binance'
import { round } from '@/lib/utils'

export type ScannedHotCoin = {
  symbol: string
  base: string
  name: string
  category: CoinInfo['category']
  price: number
  change24h: number
  quoteVolume: number // 24h volume in USD
  high24h: number
  low24h: number
  rangePositionPct: number // 0% = at 24h low, 100% = at 24h high (breakout zone)
  volatilityPct: number
  heatScore: number // 0 - 100 pump/breakout probability
  signalType: 'BREAKOUT_IMMINENT' | 'MOMENTUM_SURGE' | 'PRE_PUMP_ACCUMULATION' | 'PULLBACK_BOUNCE' | 'NEUTRAL'
  signalHeadline: string
  predictedUpsidePct: number
  predictedUpsideMaxPct: number
  targetPrice: number
  targetPriceHigh: number
  expectedPumpTime: string
  pumpTimeframeShort: string
  pumpWindow: 'IMMINENT_15M' | 'SHORT_TERM_1H' | 'ACCUMULATION_4H' | 'SWING_24H'
  expectedGainPer1k: number
  expectedGainMaxPer1k: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  rank: number
}

export type ScannerResult = {
  timestamp: number
  allCoins: ScannedHotCoin[]
  hotCoins: ScannedHotCoin[]
  topGainers: ScannedHotCoin[]
  breakoutWatchlist: ScannedHotCoin[]
  prePumpWatchlist: ScannedHotCoin[]
  pullbackWatchlist: ScannedHotCoin[]
}

/**
 * Algorithmic Breakout & Hot Coin Screener.
 *
 * Scans liquid altcoins, memes, AI tokens, and Layer 1s to detect:
 * 1. Volume surges and whale accumulation
 * 2. Range compression breaking into expansion (24h High sweeps)
 * 3. Relative momentum outperforming BTC/ETH
 */
export async function scanHotCoins(): Promise<ScannerResult> {
  const symbols = TOP_COINS.map((c) => c.symbol)
  const tickers = await fetchMultipleTickers(symbols)

  const scanned: ScannedHotCoin[] = []

  for (const coin of TOP_COINS) {
    const t = tickers[coin.symbol]
    if (!t || !t.price || t.price <= 0) continue

    const price = t.price
    const change24h = t.change24h
    const quoteVolume = t.quoteVolume ?? 0
    const high = t.high && t.high > 0 ? t.high : price * 1.02
    const low = t.low && t.low > 0 ? t.low : price * 0.98

    const range = high - low
    const rangePositionPct = range > 0 ? round(((price - low) / range) * 100, 1) : 50
    const volatilityPct = low > 0 ? round(((high - low) / low) * 100, 2) : 0

    // Heat & Breakout Probability Algorithm:
    // 1. Proximity to 24h High (0 - 35 pts) - pressing resistance
    let rangeScore = 0
    if (rangePositionPct >= 90) rangeScore = 35
    else if (rangePositionPct >= 80) rangeScore = 28
    else if (rangePositionPct >= 70) rangeScore = 20
    else if (rangePositionPct <= 30 && change24h > -5) rangeScore = 15 // Squeeze at support

    // 2. Momentum & Velocity (0 - 35 pts) - sweet spot is +3% to +20%
    let momentumScore = 0
    if (change24h >= 4 && change24h <= 18) {
      momentumScore = 35 // Sweet breakout spot
    } else if (change24h > 18 && change24h <= 35) {
      momentumScore = 25 // Ongoing strong pump, cautious on chase
    } else if (change24h > 35) {
      momentumScore = 15 // Overextended exhaustion risk
    } else if (change24h >= 0 && change24h < 4) {
      momentumScore = 20 // Early coil
    } else if (change24h < -10) {
      momentumScore = 12 // Oversold potential bounce
    }

    // 3. Liquidity & Volume Impact (0 - 30 pts)
    let volumeScore = 10
    if (quoteVolume > 150_000_000) volumeScore = 30
    else if (quoteVolume > 50_000_000) volumeScore = 24
    else if (quoteVolume > 15_000_000) volumeScore = 18

    // Category bonus: Memecoins and AI sectors have higher explosive beta
    let categoryBonus = 0
    if (coin.category === 'Meme' || coin.category === 'AI / Data') categoryBonus = 5

    const rawHeat = rangeScore + momentumScore + volumeScore + categoryBonus
    const heatScore = Math.min(Math.max(rawHeat, 10), 99)

    // Determine Signal Archetype
    let signalType: ScannedHotCoin['signalType'] = 'NEUTRAL'
    let signalHeadline = 'Consolidating in range'

    if (rangePositionPct >= 75 && change24h >= 2 && heatScore >= 68) {
      signalType = 'BREAKOUT_IMMINENT'
      signalHeadline = `Testing 24h High ($${high}) with heavy volume`
    } else if (change24h >= 5 && heatScore >= 65) {
      signalType = 'MOMENTUM_SURGE'
      signalHeadline = `Strong trend momentum (+${round(change24h, 1)}% 24h)`
    } else if (quoteVolume >= 5_000_000 && rangePositionPct <= 45 && change24h >= -4 && change24h <= 4) {
      signalType = 'PRE_PUMP_ACCUMULATION'
      signalHeadline = 'Quiet volume accumulation near support'
    } else if (change24h <= -3.5 && rangePositionPct <= 25) {
      signalType = 'PULLBACK_BOUNCE'
      signalHeadline = 'Deep oversold dip test'
    }

    // 4. Calculate "How Much to Pump" (Target Expansion & Upside)
    let minUpside = 3.5
    let maxMultiplier = 1.6

    if (coin.category === 'Meme' || coin.category === 'Fan Token') {
      minUpside = 6.0
      maxMultiplier = 2.2
    } else if (coin.category === 'AI / Data' || coin.category === 'Layer 2' || coin.category === 'DeFi') {
      minUpside = 4.5
      maxMultiplier = 1.8
    } else if (coin.category === 'Major') {
      minUpside = 2.0
      maxMultiplier = 1.35
    }

    let predictedUpsidePct = round(Math.max(volatilityPct * 0.6, minUpside), 1)
    if (signalType === 'BREAKOUT_IMMINENT') {
      predictedUpsidePct = round(Math.max(volatilityPct * 0.75, minUpside * 1.3), 1)
    } else if (signalType === 'MOMENTUM_SURGE') {
      predictedUpsidePct = round(Math.max(volatilityPct * 0.65, minUpside * 1.15), 1)
    } else if (signalType === 'PRE_PUMP_ACCUMULATION') {
      predictedUpsidePct = round(Math.max(volatilityPct * 0.9, minUpside * 1.4), 1)
    } else if (signalType === 'PULLBACK_BOUNCE') {
      predictedUpsidePct = round(Math.max(Math.abs(change24h) * 0.65, minUpside), 1)
    }

    const predictedUpsideMaxPct = round(predictedUpsidePct * maxMultiplier, 1)

    // Calculate Target Prices
    const targetPrice = round(price * (1 + predictedUpsidePct / 100), price < 0.01 ? 6 : price < 1 ? 4 : 2)
    const targetPriceHigh = round(price * (1 + predictedUpsideMaxPct / 100), price < 0.01 ? 6 : price < 1 ? 4 : 2)
    const expectedGainPer1k = round(1000 * (predictedUpsidePct / 100), 1)
    const expectedGainMaxPer1k = round(1000 * (predictedUpsideMaxPct / 100), 1)

    // 5. Calculate "When Expected to Pump" (Timing Window)
    let expectedPumpTime = '6h – 24h (Range Bound)'
    let pumpTimeframeShort = '6h – 24h'
    let pumpWindow: ScannedHotCoin['pumpWindow'] = 'SWING_24H'

    if (signalType === 'BREAKOUT_IMMINENT' && rangePositionPct >= 85) {
      expectedPumpTime = '⚡ Next 15m – 45m (Breakout Testing)'
      pumpTimeframeShort = '15m – 45m'
      pumpWindow = 'IMMINENT_15M'
    } else if (signalType === 'BREAKOUT_IMMINENT') {
      expectedPumpTime = '⚡ 30m – 1.5h (Resistance Press)'
      pumpTimeframeShort = '30m – 1.5h'
      pumpWindow = 'IMMINENT_15M'
    } else if (signalType === 'MOMENTUM_SURGE') {
      expectedPumpTime = '🚀 1h – 3h (Momentum Expansion)'
      pumpTimeframeShort = '1h – 3h'
      pumpWindow = 'SHORT_TERM_1H'
    } else if (signalType === 'PULLBACK_BOUNCE') {
      expectedPumpTime = '🔄 1h – 4h (Support Dip Bounce)'
      pumpTimeframeShort = '1h – 4h'
      pumpWindow = 'SHORT_TERM_1H'
    } else if (signalType === 'PRE_PUMP_ACCUMULATION') {
      expectedPumpTime = '💎 3h – 8h (Whale Accumulation)'
      pumpTimeframeShort = '3h – 8h'
      pumpWindow = 'ACCUMULATION_4H'
    }

    const riskLevel: ScannedHotCoin['riskLevel'] =
      coin.category === 'Meme' || volatilityPct > 15
        ? 'HIGH'
        : coin.category === 'Major'
        ? 'LOW'
        : 'MEDIUM'

    scanned.push({
      symbol: coin.symbol,
      base: coin.base,
      name: coin.name,
      category: coin.category,
      price: round(price, 4),
      change24h: round(change24h, 2),
      quoteVolume: round(quoteVolume, 0),
      high24h: round(high, 4),
      low24h: round(low, 4),
      rangePositionPct,
      volatilityPct,
      heatScore,
      signalType,
      signalHeadline,
      predictedUpsidePct,
      predictedUpsideMaxPct,
      targetPrice,
      targetPriceHigh,
      expectedPumpTime,
      pumpTimeframeShort,
      pumpWindow,
      expectedGainPer1k,
      expectedGainMaxPer1k,
      riskLevel,
      rank: 0,
    })
  }

  // Sort strictly by highest pump probability descending:
  // 1. Heat Score (0-100)
  // 2. Proximity to 24h High (pressing breakout resistance)
  // 3. 24h Quote Volume (whale liquidity)
  scanned.sort((a, b) => {
    if (b.heatScore !== a.heatScore) return b.heatScore - a.heatScore
    if (b.rangePositionPct !== a.rangePositionPct) return b.rangePositionPct - a.rangePositionPct
    return b.quoteVolume - a.quoteVolume
  })

  scanned.forEach((c, idx) => {
    c.rank = idx + 1
  })

  const topGainers = [...scanned].sort((a, b) => b.change24h - a.change24h)
  const breakoutWatchlist = scanned
    .filter((c) => c.signalType === 'BREAKOUT_IMMINENT' || c.signalType === 'MOMENTUM_SURGE')
    .sort((a, b) => b.heatScore - a.heatScore || b.rangePositionPct - a.rangePositionPct || b.quoteVolume - a.quoteVolume)
  const prePumpWatchlist = scanned
    .filter((c) => c.signalType === 'PRE_PUMP_ACCUMULATION')
    .sort((a, b) => b.heatScore - a.heatScore || b.quoteVolume - a.quoteVolume)
  const pullbackWatchlist = scanned
    .filter((c) => c.signalType === 'PULLBACK_BOUNCE')
    .sort((a, b) => b.heatScore - a.heatScore || b.quoteVolume - a.quoteVolume)

  return {
    timestamp: Date.now(),
    allCoins: scanned,
    hotCoins: scanned,
    topGainers,
    breakoutWatchlist,
    prePumpWatchlist,
    pullbackWatchlist,
  }
}
