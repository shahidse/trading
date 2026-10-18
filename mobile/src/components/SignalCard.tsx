import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Signal } from '../types'
import { useTheme, formatPercent, formatPrice } from '../theme'

interface Props {
  signal: Signal
}

export const SignalCard: React.FC<Props> = ({ signal }) => {
  const { colors } = useTheme()

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
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: colors.borderWidth,
          borderRadius: colors.borderRadiusCard,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: dirBg,
                borderColor: dirBorder,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: dirColor }]}>{signal.direction}</Text>
          </View>
          <View
            style={[
              styles.actionBadge,
              {
                borderColor: actionColor,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <Text style={[styles.actionText, { color: actionColor }]}>PLAN: {action}</Text>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreLabel, { color: colors.textSubtle }]}>COMPOSITE</Text>
          <Text style={[styles.scoreValue, { color: dirColor }]}>
            {signal.score > 0 ? `+${signal.score}` : signal.score}
          </Text>
        </View>
      </View>

      <Text style={[styles.headline, { color: colors.text }]}>{signal.plan.headline}</Text>

      {/* Stats Grid */}
      <View
        style={[
          styles.grid,
          {
            backgroundColor: colors.surface2,
            borderRadius: colors.borderRadius,
            borderColor: colors.borderSubtle,
            borderWidth: colors.borderWidth,
          },
        ]}
      >
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: colors.textSubtle }]}>Confidence</Text>
          <Text style={[styles.gridVal, { color: colors.text }]}>{signal.confidence}%</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: colors.textSubtle }]}>Regime (ADX)</Text>
          <Text style={[styles.gridVal, { color: colors.text }]}>
            {signal.regime.regime.toUpperCase()}{' '}
            {signal.regime.adx != null ? `(${Math.round(signal.regime.adx)})` : ''}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: colors.textSubtle }]}>Confluence</Text>
          <Text style={[styles.gridVal, { color: colors.text }]}>
            {signal.confluence.agreeing}/{signal.confluence.agreeing + signal.confluence.conflicting}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: colors.textSubtle }]}>ATR Adapt Multiplier</Text>
          <Text style={[styles.gridVal, { color: colors.text }]}>
            {signal.regime.thresholdMultiplier.toFixed(2)}x
          </Text>
        </View>
      </View>

      {/* Trade Levels */}
      {signal.plan.levels && (
        <View style={[styles.levelsContainer, { borderTopColor: colors.borderSubtle }]}>
          <View style={styles.levelRow}>
            <Text style={[styles.levelLabel, { color: colors.textMuted }]}>Entry Target</Text>
            <Text style={[styles.levelVal, { color: colors.entry }]}>
              {formatPrice(signal.plan.levels.entry)}
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Text style={[styles.levelLabel, { color: colors.textMuted }]}>Take Profit (2R)</Text>
            <Text style={[styles.levelVal, { color: colors.takeProfit }]}>
              {formatPrice(signal.plan.levels.takeProfit)} (
              {formatPercent(signal.plan.levels.targetDistancePct)})
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Text style={[styles.levelLabel, { color: colors.textMuted }]}>Stop Loss</Text>
            <Text style={[styles.levelVal, { color: colors.stopLoss }]}>
              {formatPrice(signal.plan.levels.stopLoss)} (
              {formatPercent(-signal.plan.levels.stopDistancePct)})
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Text style={[styles.levelLabel, { color: colors.textMuted }]}>Risk : Reward</Text>
            <Text style={[styles.levelVal, { color: colors.text }]}>
              1 : {signal.plan.levels.riskReward.toFixed(1)}
            </Text>
          </View>
        </View>
      )}

      {/* Rationale Bullet Points */}
      {signal.plan.rationale.length > 0 && (
        <View style={[styles.rationaleContainer, { borderTopColor: colors.borderSubtle }]}>
          <Text style={[styles.rationaleTitle, { color: colors.textSubtle }]}>STRATEGY REASONING</Text>
          {signal.plan.rationale.map((reason, index) => (
            <View key={index} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.textMuted }]}>{reason}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
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
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  headline: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    marginBottom: 14,
  },
  gridItem: {
    width: '47%',
  },
  gridLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  gridVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  levelsContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 12,
    gap: 6,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelLabel: {
    fontSize: 12,
  },
  levelVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  rationaleContainer: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  rationaleTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletDot: {
    marginRight: 6,
    fontSize: 12,
  },
  bulletText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
})
