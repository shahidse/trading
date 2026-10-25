import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { Signal } from '../types'
import { useTheme, formatPercent, formatPrice } from '../theme'
import { api } from '../services/api'

interface Props {
  signal: Signal
}

export const SignalCard: React.FC<Props> = ({ signal }) => {
  const { colors, layoutDensity } = useTheme()
  const [expandedRationale, setExpandedRationale] = useState(false)
  const [postingSquare, setPostingSquare] = useState(false)

  const handlePostSignalToSquare = async () => {
    setPostingSquare(true)
    try {
      const res = await api.publishToSquare({
        type: 'signal',
        signal,
      })
      if (res.success) {
        Alert.alert(
          'Posted to Binance Square! 🚀',
          res.contentId
            ? `Successfully published ${signal.symbol} signal (Post ID: ${res.contentId}).`
            : `Successfully published ${signal.symbol} signal.`
        )
      } else {
        Alert.alert('Publish Failed', res.error || 'Failed to post to Binance Square')
      }
    } catch (err: any) {
      Alert.alert('Publish Error', err.message || 'Network error while posting to Binance Square')
    } finally {
      setPostingSquare(false)
    }
  }

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
          {signal.plan.gate === 'scalp-open' && (
            <View
              style={[
                styles.scalpBadge,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text style={[styles.scalpText, { color: colors.primary }]}>⚡ SCALP</Text>
            </View>
          )}
          {signal.macroTrend && (
            <View
              style={[
                styles.macroBadge,
                {
                  backgroundColor:
                    signal.macroTrend.verdict === 'bullish'
                      ? colors.bullishBg
                      : signal.macroTrend.verdict === 'bearish'
                      ? colors.bearishBg
                      : colors.neutralBg,
                  borderColor:
                    signal.macroTrend.verdict === 'bullish'
                      ? colors.bullishBorder
                      : signal.macroTrend.verdict === 'bearish'
                      ? colors.bearishBorder
                      : colors.neutralBorder,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text
                style={[
                  styles.macroText,
                  {
                    color:
                      signal.macroTrend.verdict === 'bullish'
                        ? colors.bullish
                        : signal.macroTrend.verdict === 'bearish'
                        ? colors.bearish
                        : colors.neutral,
                  },
                ]}
              >
                {signal.macroTrend.timeframe.toUpperCase()} {signal.macroTrend.verdict.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreLabel, { color: colors.textSubtle }]}>COMPOSITE</Text>
          <Text style={[styles.scoreValue, { color: dirColor }]}>
            {signal.score > 0 ? `+${signal.score}` : signal.score}
          </Text>
        </View>
      </View>

      <Text style={[styles.headline, { color: colors.text }]}>{signal.plan.headline}</Text>

      {signal.macroTrend && (
        <View
          style={[
            styles.macroRow,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.borderSubtle,
              borderWidth: colors.borderWidth,
              borderRadius: colors.borderRadiusSm,
            },
          ]}
        >
          <Text style={[styles.macroLabel, { color: colors.textSubtle }]}>
            {signal.macroTrend.timeframe.toUpperCase()} MACRO BIAS:
          </Text>
          <Text style={[styles.macroReason, { color: colors.textMuted }]} numberOfLines={1}>
            {signal.macroTrend.detail}
          </Text>
        </View>
      )}

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
          {layoutDensity === 'compact' ? (
            <TouchableOpacity
              onPress={() => setExpandedRationale((prev) => !prev)}
              style={styles.expandRationaleRow}
            >
              <Text style={[styles.rationaleTitle, { color: colors.textSubtle, marginBottom: 0 }]}>
                STRATEGY REASONING ({signal.plan.rationale.length})
              </Text>
              <Text style={[styles.expandToggleText, { color: colors.primary }]}>
                {expandedRationale ? '▲ Hide' : '▼ Details'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.rationaleTitle, { color: colors.textSubtle }]}>STRATEGY REASONING</Text>
          )}

          {(layoutDensity !== 'compact' || expandedRationale) &&
            signal.plan.rationale.map((reason, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textMuted }]}>{reason}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Binance Square Share Action */}
      <View style={[styles.squareActionRow, { borderTopColor: colors.borderSubtle }]}>
        <TouchableOpacity
          onPress={handlePostSignalToSquare}
          disabled={postingSquare}
          style={[
            styles.squarePostBtn,
            {
              backgroundColor: colors.warningBg || '#f59e0b15',
              borderColor: colors.warning || '#f59e0b',
              borderWidth: colors.borderWidth,
              borderRadius: colors.borderRadiusSm,
            },
          ]}
        >
          {postingSquare ? (
            <ActivityIndicator size="small" color={colors.warning || '#f59e0b'} />
          ) : (
            <Text style={[styles.squarePostBtnText, { color: colors.warning || '#f59e0b' }]}>
              📢 Share Signal to Binance Square
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  scalpBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  scalpText: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  macroBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  macroText: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    gap: 6,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  macroReason: {
    fontSize: 11,
    flex: 1,
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
    flex: 1,
    minWidth: '45%',
    maxWidth: '50%',
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
  expandRationaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  squareActionRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  squarePostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squarePostBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
})
