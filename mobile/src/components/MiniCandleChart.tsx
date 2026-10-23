import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Svg, Rect, Line } from 'react-native-svg'
import { Candle, TradeLevels } from '../types'
import { useTheme, formatPrice } from '../theme'

interface Props {
  candles: Candle[]
  levels?: TradeLevels | null
  height?: number
  symbol?: string
  timeframe?: string
}

export const MiniCandleChart: React.FC<Props> = ({
  candles,
  levels,
  height = 220,
  symbol = 'ETH/USDT',
  timeframe = '15m',
}) => {
  const { colors, chartCandles } = useTheme()

  if (!candles || candles.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            height,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: colors.borderWidth,
            borderRadius: colors.borderRadiusCard,
          },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading chart data…</Text>
      </View>
    )
  }

  // Display user-configured candle zoom count
  const visible = candles.slice(-chartCandles)
  const highs = visible.map((c) => c.high)
  const lows = visible.map((c) => c.low)

  // Expand price bounds with levels if provided
  let minPrice = Math.min(...lows)
  let maxPrice = Math.max(...highs)

  if (levels) {
    minPrice = Math.min(minPrice, levels.stopLoss)
    maxPrice = Math.max(maxPrice, levels.takeProfit)
  }

  const padding = (maxPrice - minPrice) * 0.08 || 1
  minPrice -= padding
  maxPrice += padding
  const priceRange = maxPrice - minPrice

  const svgWidth = 320
  const candleGap = svgWidth / visible.length
  const candleWidth = Math.max(3, candleGap * 0.65)

  const getY = (val: number) => {
    return height - ((val - minPrice) / priceRange) * (height - 30) - 15
  }

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: height,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: colors.borderWidth,
          borderRadius: colors.borderRadiusCard,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.chartTitle, { color: colors.textSubtle }]}>
          {symbol} · {timeframe.toUpperCase()} CANDLESTICK ENGINE
        </Text>
        <Text style={[styles.latestPrice, { color: colors.text }]}>
          {formatPrice(visible[visible.length - 1]?.close)}
        </Text>
      </View>

      <Svg width="100%" height={height - 40} viewBox={`0 0 ${svgWidth} ${height - 40}`}>
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => {
          const gridY = (height - 40) * pct
          return (
            <Line
              key={pct}
              x1="0"
              y1={gridY}
              x2={svgWidth}
              y2={gridY}
              stroke={colors.borderSubtle}
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )
        })}

        {/* Trade levels overlays */}
        {levels && (
          <>
            {/* Take Profit Line */}
            <Line
              x1="0"
              y1={getY(levels.takeProfit)}
              x2={svgWidth}
              y2={getY(levels.takeProfit)}
              stroke={colors.takeProfit}
              strokeWidth="1.6"
              strokeDasharray="6 3"
            />
            {/* Entry Line */}
            <Line
              x1="0"
              y1={getY(levels.entry)}
              x2={svgWidth}
              y2={getY(levels.entry)}
              stroke={colors.entry}
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            {/* Stop Loss Line */}
            <Line
              x1="0"
              y1={getY(levels.stopLoss)}
              x2={svgWidth}
              y2={getY(levels.stopLoss)}
              stroke={colors.stopLoss}
              strokeWidth="1.6"
              strokeDasharray="6 3"
            />
          </>
        )}

        {/* Candlesticks */}
        {visible.map((c, i) => {
          const x = i * candleGap + candleGap / 2
          const isUp = c.close >= c.open
          const color = isUp ? colors.bullish : colors.bearish
          const yOpen = getY(c.open)
          const yClose = getY(c.close)
          const yHigh = getY(c.high)
          const yLow = getY(c.low)

          const rectY = Math.min(yOpen, yClose)
          const rectHeight = Math.max(2, Math.abs(yClose - yOpen))

          return (
            <React.Fragment key={c.time}>
              {/* Wick */}
              <Line
                x1={x}
                y1={yHigh}
                x2={x}
                y2={yLow}
                stroke={color}
                strokeWidth={colors.borderWidth >= 2 ? 1.5 : 1.2}
              />
              {/* Body */}
              <Rect
                x={x - candleWidth / 2}
                y={rectY}
                width={candleWidth}
                height={rectHeight}
                fill={color}
                rx={colors.borderRadiusSm > 10 ? 4 : colors.borderRadiusSm === 0 ? 0 : 1}
              />
            </React.Fragment>
          )
        })}
      </Svg>

      {/* Legend */}
      {levels && (
        <View style={[styles.legendRow, { borderTopColor: colors.borderSubtle }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.takeProfit }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>
              TP {formatPrice(levels.takeProfit)}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.entry }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>
              Entry {formatPrice(levels.entry)}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.stopLoss }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>
              SL {formatPrice(levels.stopLoss)}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  latestPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
  },
})
