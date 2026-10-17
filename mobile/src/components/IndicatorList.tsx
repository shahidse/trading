import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { IndicatorScore } from '../types'
import { colors } from '../theme'

interface Props {
  indicators: IndicatorScore[]
}

export const IndicatorList: React.FC<Props> = ({ indicators }) => {
  if (!indicators || indicators.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>MULTI-INDICATOR BREAKDOWN (9 FACTORS)</Text>
      {indicators.map((ind) => {
        const isBullish = ind.raw > 15
        const isBearish = ind.raw < -15
        const color = isBullish ? colors.bullish : isBearish ? colors.bearish : colors.neutral

        // Calculate progress bar fill
        const normalized = Math.min(100, Math.max(-100, ind.raw))
        const pct = Math.abs(normalized)

        return (
          <View key={ind.key} style={styles.item}>
            <View style={styles.topRow}>
              <View style={styles.labelCol}>
                <Text style={styles.label}>{ind.label}</Text>
                <Text style={styles.groupBadge}>
                  {ind.group} · wt {(ind.weight * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.scoreCol}>
                <Text style={[styles.rawScore, { color }]}>
                  {ind.raw > 0 ? `+${ind.raw}` : ind.raw}
                </Text>
                <Text style={styles.contrib}>{(ind.contribution >= 0 ? '+' : '') + ind.contribution.toFixed(1)}</Text>
              </View>
            </View>

            {/* Gauge bar */}
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: color,
                    alignSelf: isBearish ? 'flex-end' : 'flex-start',
                  },
                ]}
              />
            </View>

            <Text style={styles.detail}>{ind.detail}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelCol: {
    flex: 1,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  groupBadge: {
    color: colors.textSubtle,
    fontSize: 10,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  scoreCol: {
    alignItems: 'flex-end',
  },
  rawScore: {
    fontSize: 14,
    fontWeight: '800',
  },
  contrib: {
    fontSize: 10,
    color: colors.textMuted,
  },
  barBg: {
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: 2,
    marginVertical: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  detail: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
    marginTop: 2,
  },
})
