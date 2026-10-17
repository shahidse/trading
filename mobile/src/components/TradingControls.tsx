import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { TradingStateResponse } from '../types'
import { colors, formatPrice } from '../theme'
import { api } from '../services/api'

interface Props {
  state: TradingStateResponse | null
  onRefresh: () => void
}

export const TradingControls: React.FC<Props> = ({ state, onRefresh }) => {
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
    <View style={styles.container}>
      <Text style={styles.title}>TRADING ENGINE & FINANCIAL SAFETY</Text>

      {/* Safety Status Grid */}
      <View style={styles.statusGrid}>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Mode</Text>
          <Text style={[styles.statusVal, { color: settings.dryRun ? colors.warning : colors.bullish }]}>
            {settings.dryRun ? 'DRY-RUN' : 'LIVE'}
          </Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Network</Text>
          <Text style={styles.statusVal}>{settings.testnet ? 'TESTNET' : 'MAINNET'}</Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>24h P&L</Text>
          <Text
            style={[
              styles.statusVal,
              { color: realisedPnl24h >= 0 ? colors.bullish : colors.bearish },
            ]}
          >
            {realisedPnl24h >= 0 ? `+$${realisedPnl24h.toFixed(2)}` : `-$${Math.abs(realisedPnl24h).toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Position</Text>
          <Text style={[styles.statusVal, { color: openPosition ? colors.bullish : colors.textMuted }]}>
            {openPosition ? `${openPosition.quantity.toFixed(4)} ETH` : 'FLAT'}
          </Text>
        </View>
      </View>

      {/* Open Position details if active */}
      {openPosition && (
        <View style={styles.positionBanner}>
          <Text style={styles.posTitle}>ACTIVE LONG POSITION</Text>
          <Text style={styles.posText}>
            Filled at {formatPrice(openPosition.price)} · Size: {formatPrice(openPosition.notionalUsd)}
          </Text>
          {openPosition.stopLossPrice && (
            <Text style={styles.posSub}>
              SL: {formatPrice(openPosition.stopLossPrice)} | TP: {formatPrice(openPosition.takeProfitPrice)}
            </Text>
          )}
        </View>
      )}

      {/* Controls Button Row */}
      <View style={styles.buttonsRow}>
        {/* Emergency Kill Switch */}
        <TouchableOpacity
          style={[styles.btn, isKilled ? styles.btnResume : styles.btnHalt]}
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

        {/* Arm / Disarm */}
        <TouchableOpacity
          style={[styles.btn, isArmed ? styles.btnDisarm : styles.btnArm]}
          onPress={() => handleAction(isArmed ? 'disarm' : 'arm')}
          disabled={loadingAction !== null || isKilled}
        >
          {loadingAction === 'arm' || loadingAction === 'disarm' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>{isArmed ? 'DISARM BOT' : 'ARM TRADER'}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
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
    backgroundColor: colors.surface2,
    borderRadius: 10,
    padding: 10,
  },
  statusLabel: {
    fontSize: 10,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statusVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    color: colors.text,
  },
  positionBanner: {
    backgroundColor: colors.bullishBg,
    borderColor: colors.bullishBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  posTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.bullish,
    letterSpacing: 0.6,
  },
  posText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  posSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHalt: {
    backgroundColor: colors.bearish,
  },
  btnResume: {
    backgroundColor: colors.warning,
  },
  btnArm: {
    backgroundColor: colors.bullish,
  },
  btnDisarm: {
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
