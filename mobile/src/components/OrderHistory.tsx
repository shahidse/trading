import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { TradeOrder } from '../types'
import { useTheme, formatDate, formatPrice } from '../theme'

interface Props {
  orders: TradeOrder[]
  openPosition?: TradeOrder | null
  realisedPnl24h?: number
}

const STATUS_STYLE: Record<string, { label: string; colorKey: 'bullish' | 'warning' | 'bearish' | 'primary' | 'textMuted' }> = {
  placed: { label: 'FILLED', colorKey: 'bullish' },
  'dry-run': { label: 'SIMULATED', colorKey: 'primary' },
  refused: { label: 'REFUSED', colorKey: 'warning' },
  error: { label: 'FAILED', colorKey: 'bearish' },
  skipped: { label: 'SKIPPED', colorKey: 'textMuted' },
}

export const OrderHistory: React.FC<Props> = ({ orders = [], openPosition, realisedPnl24h = 0 }) => {
  const { colors } = useTheme()

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
        <View>
          <Text style={[styles.title, { color: colors.textSubtle }]}>ORDER & EXECUTION HISTORY</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Live spot orders and dry-run paper executions
          </Text>
        </View>
        <View
          style={[
            styles.pnlBadge,
            {
              backgroundColor: realisedPnl24h >= 0 ? colors.bullishBg : colors.bearishBg,
              borderColor: realisedPnl24h >= 0 ? colors.bullishBorder : colors.bearishBorder,
              borderWidth: colors.borderWidth,
            },
          ]}
        >
          <Text
            style={[
              styles.pnlText,
              { color: realisedPnl24h >= 0 ? colors.bullish : colors.bearish },
            ]}
          >
            24h: {realisedPnl24h >= 0 ? '+' : ''}${realisedPnl24h.toFixed(3)}
          </Text>
        </View>
      </View>

      {/* Orders List or Empty State */}
      {(!orders || orders.length === 0) ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders Recorded Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSubtle }]}>
            Dry-run paper trades and live spot executions will stream here automatically.
          </Text>
        </View>
      ) : (
        orders.slice(0, 15).map((order) => {
        const isBuy = order.side === 'BUY'
        const sideColor = isBuy ? colors.bullish : colors.bearish
        const statusMeta = STATUS_STYLE[order.status] ?? {
          label: order.status.toUpperCase(),
          colorKey: 'textMuted',
        }
        const statusColor = colors[statusMeta.colorKey] || colors.textMuted
        const timestamp = order.createdAt || order.executedAt || Date.now()
        const pnl = order.realisedPnlUsd

        return (
          <View
            key={order.id}
            style={[styles.orderCard, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={styles.topLine}>
              <View style={styles.sideBadgeGroup}>
                <View
                  style={[
                    styles.sidePill,
                    {
                      backgroundColor: isBuy ? colors.bullishBg : colors.bearishBg,
                      borderColor: isBuy ? colors.bullishBorder : colors.bearishBorder,
                      borderWidth: colors.borderWidth,
                    },
                  ]}
                >
                  <Text style={[styles.sideText, { color: sideColor }]}>{order.side}</Text>
                </View>
                {order.type === 'oco' && (
                  <View
                    style={[
                      styles.ocoPill,
                      {
                        backgroundColor: colors.primaryLight,
                        borderColor: colors.primary,
                        borderWidth: colors.borderWidth,
                      },
                    ]}
                  >
                    <Text style={[styles.ocoText, { color: colors.primary }]}>OCO</Text>
                  </View>
                )}
                <Text style={[styles.timeText, { color: colors.textMuted }]}>
                  {formatDate(timestamp)}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: colors.surface2, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusMeta.label}
                </Text>
              </View>
            </View>

            {/* Price & Qty line */}
            <View style={styles.metricsLine}>
              <Text style={[styles.metricMain, { color: colors.text }]}>
                {order.quantity ? order.quantity.toFixed(4) : '—'} ETH @{' '}
                {order.price ? formatPrice(order.price) : '—'}
              </Text>
              <Text style={[styles.notional, { color: colors.textSubtle }]}>
                {order.notionalUsd ? `$${order.notionalUsd.toFixed(2)}` : '—'}
              </Text>
            </View>

            {/* Realised P&L if available */}
            {pnl != null && (
              <View style={styles.pnlLine}>
                <Text style={[styles.pnlLabel, { color: colors.textSubtle }]}>Realised P&L: </Text>
                <Text
                  style={[
                    styles.pnlVal,
                    { color: pnl >= 0 ? colors.bullish : colors.bearish },
                  ]}
                >
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(4)}
                </Text>
              </View>
            )}

            {/* Reason */}
            {order.reason ? (
              <Text style={[styles.reasonText, { color: colors.textMuted }]} numberOfLines={2}>
                {order.reason}
              </Text>
            ) : null}
          </View>
        )
      }))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  pnlBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pnlText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  orderCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sideBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sidePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sideText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ocoPill: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ocoText: {
    fontSize: 8,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 10,
    marginLeft: 4,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  metricsLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricMain: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  notional: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  pnlLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pnlLabel: {
    fontSize: 10,
  },
  pnlVal: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  reasonText: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
})
