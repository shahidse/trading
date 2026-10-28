import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { api } from '../services/api'
import { ExecutionVenue } from '../types'
import { useTheme } from '../theme'

interface VenueItem {
  id: ExecutionVenue
  name: string
  label: string
  icon: string
  type: string
  isDefault?: boolean
}

const VENUES: VenueItem[] = [
  {
    id: 'binance',
    name: 'Binance Spot',
    label: 'Binance',
    icon: '⚡',
    type: 'CEX',
    isDefault: true,
  },
  {
    id: 'hyperliquid',
    name: 'Hyperliquid DEX',
    label: 'Hyperliquid',
    icon: '💧',
    type: 'DEX',
  },
  {
    id: 'solana',
    name: 'Solana Jupiter',
    label: 'Jupiter',
    icon: '🪐',
    type: 'DEX',
  },
]

export const VenueSelector: React.FC = () => {
  const { colors } = useTheme()
  const [activeVenue, setActiveVenue] = useState<ExecutionVenue>('binance')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .getVenue()
      .then((res) => {
        if (res?.activeVenue) setActiveVenue(res.activeVenue)
      })
      .catch(() => {})
  }, [])

  const handleSelectVenue = async (venue: ExecutionVenue) => {
    if (venue === activeVenue) return
    setActiveVenue(venue)
    setLoading(true)
    try {
      const res = await api.setVenue(venue)
      if (res.success) {
        Alert.alert(
          'Venue Switched',
          `Active trading venue set to ${venue === 'binance' ? 'Binance Spot' : venue === 'hyperliquid' ? 'Hyperliquid DEX' : 'Solana Jupiter DEX'}.`
        )
      }
    } catch (err: any) {
      Alert.alert('Venue Error', err.message || 'Failed to switch venue')
    } finally {
      setLoading(false)
    }
  }

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
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.title, { color: colors.text }]}>EXECUTION VENUE</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Active route: {VENUES.find((v) => v.id === activeVenue)?.name}
          </Text>
        </View>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <View style={styles.venueRow}>
        {VENUES.map((v) => {
          const isSelected = activeVenue === v.id
          return (
            <TouchableOpacity
              key={v.id}
              activeOpacity={0.8}
              onPress={() => handleSelectVenue(v.id)}
              disabled={loading}
              style={[
                styles.venueBtn,
                {
                  backgroundColor: isSelected ? colors.primaryLight : colors.surface2,
                  borderColor: isSelected ? colors.primary : colors.borderSubtle,
                  borderWidth: isSelected ? 1.5 : colors.borderWidth,
                  borderRadius: colors.borderRadiusSm,
                },
              ]}
            >
              <Text style={styles.venueIcon}>{v.icon}</Text>
              <View style={styles.venueInfo}>
                <Text
                  style={[
                    styles.venueLabel,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {v.label}
                </Text>
                <Text
                  style={[
                    styles.venueTypeBadge,
                    {
                      color: isSelected ? colors.primary : colors.textSubtle,
                    },
                  ]}
                >
                  {v.isDefault ? 'DEFAULT' : v.type}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
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
    marginBottom: 8,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  venueRow: {
    flexDirection: 'row',
    gap: 6,
  },
  venueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 6,
  },
  venueIcon: {
    fontSize: 14,
  },
  venueInfo: {
    flex: 1,
  },
  venueLabel: {
    fontSize: 11,
  },
  venueTypeBadge: {
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 1,
  },
})
