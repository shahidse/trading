import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { IndicatorScore } from '../types'
import { useTheme } from '../theme'

interface Props {
  indicators: IndicatorScore[]
}

export const IndicatorList: React.FC<Props> = ({ indicators }) => {
  const { colors } = useTheme()

  if (!indicators || indicators.length === 0) return null

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
      <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>
        MULTI-INDICATOR BREAKDOWN (9 FACTORS)
      </Text>
      {indicators.map((ind) => {
        const isBullish = ind.raw > 15
        const isBearish = ind.raw < -15
        const color = isBullish ? colors.bullish : isBearish ? colors.bearish : colors.neutral

        const normalized = Math.min(100, Math.max(-100, ind.raw))
        const pct = Math.abs(normalized)

        return (
          <View
            key={ind.key}
            style={[styles.item, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={styles.topRow}>
              <View style={styles.labelCol}>
                <Text style={[styles.label, { color: colors.text }]}>{ind.label}</Text>
                <Text style={[styles.groupBadge, { color: colors.textSubtle }]}>
                  {ind.group} · wt {(ind.weight * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.scoreCol}>
                <Text style={[styles.rawScore, { color }]}>
                  {ind.raw > 0 ? `+${ind.raw}` : ind.raw}
                </Text>
                <Text style={[styles.contrib, { color: colors.textMuted }]}>
                  {(ind.contribution >= 0 ? '+' : '') + ind.contribution.toFixed(1)}
                </Text>
              </View>
            </View>

            {/* Gauge bar */}
            <View style={[styles.barBg, { backgroundColor: colors.surface2 }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: color,
                    alignSelf: isBearish ? 'flex-end' : 'flex-start',
                    borderRadius: colors.borderRadiusSm,
                  },
                ]}
              />
            </View>

            <Text style={[styles.detail, { color: colors.textMuted }]}>{ind.detail}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  item: {
    borderBottomWidth: 1,
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
    fontSize: 13,
    fontWeight: '800',
  },
  groupBadge: {
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
  },
  barBg: {
    height: 4,
    marginVertical: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  detail: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
})
