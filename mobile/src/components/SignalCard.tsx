import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Signal } from '../types'
import { colors, formatPercent, formatPrice } from '../theme'

interface Props {
  signal: Signal
}

export const SignalCard: React.FC<Props> = ({ signal }) => {
  const isLong = signal.direction === 'LONG'
  const isShort = signal.direction === 'SHORT'
  const dirColor = isLong ? colors.bullish : isShort ? colors.bearish : colors.neutral
  const dirBg = isLong ? colors.bullishBg : isShort ? colors.bearishBg : colors.neutralBg
  const dirBorder = isLong ? colors.bullishBorder : isShort ? colors.bearishBorder : colors.neutralBorder

  const action = signal.plan.action
  const actionColor =
    action === 'BUY'
      ? colors.bullish
      : action === 'SELL'
      ? colors.bearish
      : action === 'HOLD'
      ? colors.warning
      : colors.neutral

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: dirBg, borderColor: dirBorder }]}>
            <Text style={[styles.badgeText, { color: dirColor }]}>{signal.direction}</Text>
          </View>
          <View style={[styles.actionBadge, { borderColor: actionColor }]}>
            <Text style={[styles.actionText, { color: actionColor }]}>PLAN: {action}</Text>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={[styles.scoreValue, { color: dirColor }]}>
            {signal.score > 0 ? `+${signal.score}` : signal.score}
          </Text>
        </View>
      </View>

      <Text style={styles.headline}>{signal.plan.headline}</Text>

      {/* Stats Grid */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Confidence</Text>
          <Text style={styles.gridVal}>{signal.confidence}%</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Regime (ADX)</Text>
          <Text style={styles.gridVal}>
            {signal.regime.regime.toUpperCase()}{' '}
            {signal.regime.adx != null ? `(${Math.round(signal.regime.adx)})` : ''}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Confluence</Text>
          <Text style={styles.gridVal}>
            {signal.confluence.agreeing}/{signal.confluence.agreeing + signal.confluence.conflicting}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>ATR Multiplier</Text>
          <Text style={styles.gridVal}>{signal.regime.thresholdMultiplier.toFixed(2)}x</Text>
        </View>
      </View>

      {/* Trade Levels if available */}
      {signal.plan.levels && (
        <View style={styles.levelsContainer}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Entry Target</Text>
            <Text style={[styles.levelVal, { color: colors.entry }]}>
              {formatPrice(signal.plan.levels.entry)}
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Take Profit (2R)</Text>
            <Text style={[styles.levelVal, { color: colors.takeProfit }]}>
              {formatPrice(signal.plan.levels.takeProfit)} (
              {formatPercent(signal.plan.levels.targetDistancePct)})
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Stop Loss</Text>
            <Text style={[styles.levelVal, { color: colors.stopLoss }]}>
              {formatPrice(signal.plan.levels.stopLoss)} (
              {formatPercent(-signal.plan.levels.stopDistancePct)})
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Risk : Reward</Text>
            <Text style={[styles.levelVal, { color: colors.text }]}>
              1 : {signal.plan.levels.riskReward.toFixed(1)}
            </Text>
          </View>
        </View>
      )}

      {/* Rationale Bullet Points */}
      {signal.plan.rationale.length > 0 && (
        <View style={styles.rationaleContainer}>
          <Text style={styles.rationaleTitle}>STRATEGY REASONING</Text>
          {signal.plan.rationale.map((reason, index) => (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 9,
    color: colors.textSubtle,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  headline: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  gridItem: {
    width: '47%',
  },
  gridLabel: {
    fontSize: 10,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  gridVal: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    marginTop: 2,
  },
  levelsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 12,
    marginBottom: 12,
    gap: 6,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  levelVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  rationaleContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 10,
  },
  rationaleTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletDot: {
    color: colors.primary,
    marginRight: 6,
    fontSize: 12,
  },
  bulletText: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
})
