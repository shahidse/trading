import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Signal } from '../types'
import { colors, formatDate } from '../theme'

interface Props {
  signals: Signal[]
}

export const SignalHistory: React.FC<Props> = ({ signals }) => {
  if (!signals || signals.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RECENT SIGNAL LOG</Text>
      {signals.slice(0, 15).map((item, idx) => {
        const isLong = item.direction === 'LONG'
        const isShort = item.direction === 'SHORT'
        const dirColor = isLong ? colors.bullish : isShort ? colors.bearish : colors.neutral

        return (
          <View key={item.id ?? idx} style={styles.row}>
            <View style={styles.leftCol}>
              <View style={styles.dirRow}>
                <Text style={[styles.direction, { color: dirColor }]}>{item.direction}</Text>
                <Text style={styles.action}>({item.plan.action})</Text>
              </View>
              <Text style={styles.time}>{formatDate(item.timestamp)}</Text>
            </View>

            <View style={styles.rightCol}>
              <Text style={[styles.score, { color: dirColor }]}>
                {item.score > 0 ? `+${item.score}` : item.score}
              </Text>
              <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  leftCol: {
    flex: 1,
  },
  dirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  direction: {
    fontSize: 13,
    fontWeight: '800',
  },
  action: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  time: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 14,
    fontWeight: '800',
  },
  price: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
})
