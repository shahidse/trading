import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { colors } from '../theme'
import { api } from '../services/api'
import { NotifySettings, TradingStateResponse } from '../types'

interface Props {
  onClose: () => void
}

export const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backendUrl, setBackendUrl] = useState(api.getBaseUrl())

  // Trading settings
  const [dryRun, setDryRun] = useState(true)
  const [testnet, setTestnet] = useState(true)
  const [notionalUsd, setNotionalUsd] = useState('50')
  const [maxNotionalUsd, setMaxNotionalUsd] = useState('250')
  const [dailyLossLimitUsd, setDailyLossLimitUsd] = useState('100')
  const [useOcoBracket, setUseOcoBracket] = useState(true)

  // Notification settings
  const [tgEnabled, setTgEnabled] = useState(false)
  const [tgChatId, setTgChatId] = useState('')
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [emailTo, setEmailTo] = useState('')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const [tradesRes, notifyRes] = await Promise.all([
          api.getTrades().catch(() => null),
          api.getSettings().catch(() => null),
        ])

        if (tradesRes?.settings) {
          setDryRun(tradesRes.settings.dryRun)
          setTestnet(tradesRes.settings.testnet)
          setNotionalUsd(String(tradesRes.settings.notionalUsd))
          setMaxNotionalUsd(String(tradesRes.settings.maxNotionalUsd))
          setDailyLossLimitUsd(String(tradesRes.settings.dailyLossLimitUsd))
          setUseOcoBracket(tradesRes.settings.useOcoBracket)
        }

        if (notifyRes?.settings) {
          setTgEnabled(notifyRes.settings.telegram.enabled)
          setTgChatId(notifyRes.settings.telegram.chatId || '')
          setEmailEnabled(notifyRes.settings.email.enabled)
          setEmailTo(notifyRes.settings.email.to || '')
        }
      } catch (err: any) {
        Alert.alert('Load Settings Error', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      api.setBaseUrl(backendUrl.trim())

      await Promise.all([
        api.updateTradingSettings({
          dryRun,
          testnet,
          notionalUsd: parseFloat(notionalUsd) || 50,
          maxNotionalUsd: parseFloat(maxNotionalUsd) || 250,
          dailyLossLimitUsd: parseFloat(dailyLossLimitUsd) || 100,
          useOcoBracket,
        }),
        api.updateSettings({
          telegram: { enabled: tgEnabled, chatId: tgChatId },
          email: { enabled: emailEnabled, to: emailTo },
        }),
      ])

      Alert.alert('Saved', 'Configuration settings updated successfully.')
      onClose()
    } catch (err: any) {
      Alert.alert('Save Failed', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS & CONFIGURATION</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Reading server configuration…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Server Connection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEXT.JS BACKEND ENDPOINT</Text>
            <Text style={styles.sectionHint}>
              Physical device: Use LAN IP (e.g. http://10.211.232.112:3000). Emulator: http://10.0.2.2:3000
            </Text>
            <TextInput
              style={styles.input}
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="http://localhost:3000"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Risk & Execution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXECUTION & RISK GUARDS</Text>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Dry-Run Mode</Text>
                <Text style={styles.switchHint}>Simulate fills without exchange balance</Text>
              </View>
              <Switch
                value={dryRun}
                onValueChange={setDryRun}
                trackColor={{ false: colors.surface3, true: colors.warning }}
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Binance Testnet</Text>
                <Text style={styles.switchHint}>Use Binance Spot testnet environment</Text>
              </View>
              <Switch
                value={testnet}
                onValueChange={setTestnet}
                trackColor={{ false: colors.surface3, true: colors.primary }}
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Native OCO Bracket</Text>
                <Text style={styles.switchHint}>Simultaneous TP limit & SL on exchange</Text>
              </View>
              <Switch
                value={useOcoBracket}
                onValueChange={setUseOcoBracket}
                trackColor={{ false: colors.surface3, true: colors.bullish }}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Per-Trade Size (USD)</Text>
              <TextInput
                style={styles.input}
                value={notionalUsd}
                onChangeText={setNotionalUsd}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Max Notional Cap (USD)</Text>
              <TextInput
                style={styles.input}
                value={maxNotionalUsd}
                onChangeText={setMaxNotionalUsd}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Rolling 24h Loss Ceiling (USD)</Text>
              <TextInput
                style={styles.input}
                value={dailyLossLimitUsd}
                onChangeText={setDailyLossLimitUsd}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Notification Alerts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ALERTS & NOTIFICATIONS</Text>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Telegram Alerts</Text>
                <Text style={styles.switchHint}>Dispatch signals to Telegram bot</Text>
              </View>
              <Switch
                value={tgEnabled}
                onValueChange={setTgEnabled}
                trackColor={{ false: colors.surface3, true: colors.primary }}
              />
            </View>

            {tgEnabled && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Telegram Chat ID</Text>
                <TextInput
                  style={styles.input}
                  value={tgChatId}
                  onChangeText={setTgChatId}
                  placeholder="e.g. 12345678"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
            )}

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Resend Email Alerts</Text>
                <Text style={styles.switchHint}>Dispatch signals to email</Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ false: colors.surface3, true: colors.primary }}
              />
            </View>

            {emailEnabled && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Recipient Email</Text>
                <TextInput
                  style={styles.input}
                  value={emailTo}
                  onChangeText={setEmailTo}
                  keyboardType="email-address"
                  placeholder="trader@example.com"
                  placeholderTextColor={colors.textDisabled}
                  autoCapitalize="none"
                />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save All Settings</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.8,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface2,
  },
  closeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 10,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  switchHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  field: {
    marginTop: 12,
  },
  fieldLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
