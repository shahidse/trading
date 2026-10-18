import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { TradingStateResponse } from '../types'
import { useTheme, formatPrice } from '../theme'
import { api } from '../services/api'

interface Props {
  state: TradingStateResponse | null
  onRefresh: () => void
}

export const TradingControls: React.FC<Props> = ({ state, onRefresh }) => {
  const { colors } = useTheme()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  if (!state) return null

  const { settings, openPosition, realisedPnl24h } = state
  const isKilled = settings.killSwitch
  const isArmed = settings.enabled

  const handleAction = async (action: 'halt' | 'resume' | 'arm' | 'disarm') => {
    const title =
      action === 'halt'
        ? 'Emergency Kill Switch'
        : action === 'resume'
        ? 'Resume Trading Bot'
        : action === 'arm'
        ? 'Arm Live Auto-Trader'
        : 'Disarm Auto-Trader'

    const message =
      action === 'halt'
        ? 'This will immediately freeze all trading operations.'
        : action === 'arm'
        ? `Are you sure? Bot will trade with notional $${settings.notionalUsd} ${settings.dryRun ? '(Dry-run mode)' : '(LIVE MODE)'}.`
        : 'Update trader status?'

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: action === 'halt' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setLoadingAction(action)
            await api.setTradingAction(action)
            onRefresh()
          } catch (err: any) {
            Alert.alert('Action Failed', err.message)
          } finally {
            setLoadingAction(null)
          }
        },
      },
    ])
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
      <Text style={[styles.title, { color: colors.textSubtle }]}>
        FINANCIAL SAFETY & BOT ENGINE
      </Text>

      {/* Safety Status Grid */}
      <View style={styles.statusGrid}>
        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: colors.surface2,
              borderRadius: colors.borderRadius,
              borderColor: colors.borderSubtle,
              borderWidth: colors.borderWidth,
            },
          ]}
        >
          <Text style={[styles.statusLabel, { color: colors.textSubtle }]}>Mode</Text>
          <Text
            style={[
              styles.statusVal,
              { color: settings.dryRun ? colors.warning : colors.bullish },
            ]}
          >
            {settings.dryRun ? 'DRY-RUN' : 'LIVE'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: colors.surface2,
              borderRadius: colors.borderRadius,
              borderColor: colors.borderSubtle,
              borderWidth: colors.borderWidth,
            },
          ]}
        >
          <Text style={[styles.statusLabel, { color: colors.textSubtle }]}>Network</Text>
          <Text style={[styles.statusVal, { color: colors.text }]}>
            {settings.testnet ? 'TESTNET' : 'MAINNET'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: colors.surface2,
              borderRadius: colors.borderRadius,
              borderColor: colors.borderSubtle,
              borderWidth: colors.borderWidth,
            },
          ]}
        >
          <Text style={[styles.statusLabel, { color: colors.textSubtle }]}>24h P&L</Text>
          <Text
            style={[
              styles.statusVal,
              { color: realisedPnl24h >= 0 ? colors.bullish : colors.bearish },
            ]}
          >
            {realisedPnl24h >= 0
              ? `+$${realisedPnl24h.toFixed(2)}`
              : `-$${Math.abs(realisedPnl24h).toFixed(2)}`}
          </Text>
        </View>

        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: colors.surface2,
              borderRadius: colors.borderRadius,
              borderColor: colors.borderSubtle,
              borderWidth: colors.borderWidth,
            },
          ]}
        >
          <Text style={[styles.statusLabel, { color: colors.textSubtle }]}>Position</Text>
          <Text
            style={[
              styles.statusVal,
              { color: openPosition ? colors.bullish : colors.textMuted },
            ]}
          >
            {openPosition ? `${openPosition.quantity.toFixed(4)} ETH` : 'FLAT'}
          </Text>
        </View>
      </View>

      {/* Open Position details if active */}
      {openPosition && (
        <View
          style={[
            styles.positionBanner,
            {
              backgroundColor: openPosition.side === 'BUY' ? colors.bullishBg : colors.bearishBg,
              borderColor: openPosition.side === 'BUY' ? colors.bullishBorder : colors.bearishBorder,
              borderWidth: colors.borderWidth,
              borderRadius: colors.borderRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.posTitle,
              { color: openPosition.side === 'BUY' ? colors.bullish : colors.bearish },
            ]}
          >
            ACTIVE {openPosition.side} POSITION ({openPosition.quantity.toFixed(4)} ETH)
          </Text>
          <Text style={[styles.posText, { color: colors.text }]}>
            Filled at {formatPrice(openPosition.price)} · Size: {formatPrice(openPosition.notionalUsd)}
          </Text>
          {openPosition.stopLossPrice && (
            <Text style={[styles.posSub, { color: colors.textMuted }]}>
              SL: {formatPrice(openPosition.stopLossPrice)} | TP: {formatPrice(openPosition.takeProfitPrice)}
            </Text>
          )}
        </View>
      )}

      {/* Controls Button Row */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor: isKilled ? colors.warning : colors.bearish,
              borderRadius: colors.borderRadius,
              borderWidth: colors.borderWidth,
              borderColor: isKilled ? colors.warningBorder : colors.bearishBorder,
            },
          ]}
          onPress={() => handleAction(isKilled ? 'resume' : 'halt')}
          disabled={loadingAction !== null}
        >
          {loadingAction === 'halt' || loadingAction === 'resume' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>
              {isKilled ? 'RESET HALT' : 'KILL SWITCH (HALT)'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor: isArmed ? colors.surface3 : colors.bullish,
              borderRadius: colors.borderRadius,
              borderWidth: colors.borderWidth,
              borderColor: isArmed ? colors.border : colors.bullishBorder,
            },
          ]}
          onPress={() => handleAction(isArmed ? 'disarm' : 'arm')}
          disabled={loadingAction !== null || isKilled}
        >
          {loadingAction === 'arm' || loadingAction === 'disarm' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.btnText, { color: isArmed ? colors.text : '#ffffff' }]}>
              {isArmed ? 'DISARM BOT' : 'ARM TRADER'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statusBox: {
    width: '48%',
    padding: 10,
  },
  statusLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statusVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  positionBanner: {
    padding: 10,
    marginBottom: 12,
  },
  posTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  posText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  posSub: {
    fontSize: 11,
    marginTop: 2,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
