import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { api } from '../services/api'
import { OrderBookDepth } from '../types'
import { useTheme, formatPrice } from '../theme'

export interface OrderBookWidgetProps {
  symbol?: string
}

export const OrderBookWidget: React.FC<OrderBookWidgetProps> = ({
  symbol = 'ETH/USDT',
}) => {
  const { colors, currency, pkrRate } = useTheme()
  const [depth, setDepth] = useState<OrderBookDepth | null>(null)
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const loadDepth = async () => {
    try {
      setLoading(true)
      const data = await api.getOrderBook(symbol)
      setDepth(data)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepth()
    const timer = setInterval(loadDepth, 15000)
    return () => clearInterval(timer)
  }, [symbol])

  const asks = (depth?.asks || []).slice(0, 5)
  const bids = (depth?.bids || []).slice(0, 5)

  const maxAskQty = Math.max(...asks.map((a) => a.quantity), 0.001)
  const maxBidQty = Math.max(...bids.map((b) => b.quantity), 0.001)
  const maxQty = Math.max(maxAskQty, maxBidQty, 1)

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: colors.borderWidth,
          borderRadius: colors.borderRadiusCard,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.headerIcon}>📖</Text>
          <Text style={[styles.title, { color: colors.text }]}>Order Book Depth</Text>
          <Text style={[styles.symbolBadge, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
            {symbol}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={loadDepth}
            disabled={loading}
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.borderSubtle,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>↻</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCollapsed(!collapsed)}
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.borderSubtle,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>
              {collapsed ? '▼' : '▲'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!collapsed && (
        <View style={styles.body}>
          {/* Asks (Sells) in reverse order (highest to lowest) */}
          <View style={styles.bookSide}>
            {[...asks].reverse().map((ask, idx) => {
              const widthPct = Math.min(100, Math.round((ask.quantity / maxQty) * 100))
              return (
                <View key={`ask-${idx}`} style={styles.bookRow}>
                  <View
                    style={[
                      styles.depthFill,
                      {
                        backgroundColor: colors.bearishBg,
                        width: `${widthPct}%`,
                      },
                    ]}
                  />
                  <Text style={[styles.bookPrice, { color: colors.bearish }]}>
                    {formatPrice(ask.price, undefined, currency, pkrRate)}
                  </Text>
                  <Text style={[styles.bookQty, { color: colors.textMuted }]}>
                    {ask.quantity.toFixed(4)}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Spread Banner */}
          <View
            style={[
              styles.spreadBanner,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.spreadText, { color: colors.textSubtle }]}>
              Spread: {formatPrice(depth?.spread, 2, currency, pkrRate)} ({depth?.spreadPercent.toFixed(3) || '0.000'}%)
            </Text>
            <Text style={[styles.midPriceText, { color: colors.text }]}>
              Mid: {formatPrice(depth?.midPrice, undefined, currency, pkrRate)}
            </Text>
          </View>

          {/* Bids (Buys) */}
          <View style={styles.bookSide}>
            {bids.map((bid, idx) => {
              const widthPct = Math.min(100, Math.round((bid.quantity / maxQty) * 100))
              return (
                <View key={`bid-${idx}`} style={styles.bookRow}>
                  <View
                    style={[
                      styles.depthFill,
                      {
                        backgroundColor: colors.bullishBg,
                        width: `${widthPct}%`,
                      },
                    ]}
                  />
                  <Text style={[styles.bookPrice, { color: colors.bullish }]}>
                    {formatPrice(bid.price, undefined, currency, pkrRate)}
                  </Text>
                  <Text style={[styles.bookQty, { color: colors.textMuted }]}>
                    {bid.quantity.toFixed(4)}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon: {
    fontSize: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  symbolBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    marginTop: 8,
  },
  bookSide: {
    gap: 2,
  },
  bookRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  depthFill: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
  bookPrice: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  bookQty: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  spreadBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  spreadText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
  },
  midPriceText: {
    fontSize: 10.5,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
})
