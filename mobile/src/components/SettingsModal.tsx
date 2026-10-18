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
import { useTheme } from '../theme'
import { api } from '../services/api'
import { NotifySettings, TradingStateResponse } from '../types'
import { ThemeSelector } from './ThemeSelector'

interface Props {
  onClose: () => void
}

export const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const { colors } = useTheme()
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: colors.borderWidth,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          SETTINGS & FINANCIAL LIMITS
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={[
            styles.closeBtn,
            {
              backgroundColor: colors.surface2,
              borderRadius: colors.borderRadiusSm,
              borderWidth: colors.borderWidth,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Reading server configuration…
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Design Archetype & Theme Mode */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusCard,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>
              DESIGN ARCHETYPE & THEME
            </Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Switch between 4 layouts and light/dark color palettes.
            </Text>
            <ThemeSelector />
          </View>

          {/* Server Connection */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusCard,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>
              BACKEND ENDPOINT (NETLIFY / LOCAL)
            </Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Default is your deployed Netlify production app.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                  borderWidth: colors.borderWidth,
                  borderRadius: colors.borderRadius,
                  color: colors.text,
                },
              ]}
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="https://jade-pavlova-ba20a5.netlify.app"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Risk & Execution */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusCard,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>
              EXECUTION & RISK GUARDS
            </Text>

            <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Dry-Run Mode</Text>
                <Text style={[styles.switchHint, { color: colors.textMuted }]}>
                  Simulate fills without exchange balance
                </Text>
              </View>
              <Switch
                value={dryRun}
                onValueChange={setDryRun}
                trackColor={{ false: colors.surface3, true: colors.warning }}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Binance Testnet</Text>
                <Text style={[styles.switchHint, { color: colors.textMuted }]}>
                  Use Binance Spot testnet environment
                </Text>
              </View>
              <Switch
                value={testnet}
                onValueChange={setTestnet}
                trackColor={{ false: colors.surface3, true: colors.primary }}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Native OCO Bracket</Text>
                <Text style={[styles.switchHint, { color: colors.textMuted }]}>
                  Simultaneous TP limit & SL on exchange
                </Text>
              </View>
              <Switch
                value={useOcoBracket}
                onValueChange={setUseOcoBracket}
                trackColor={{ false: colors.surface3, true: colors.bullish }}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>
                Per-Trade Size (USD)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.border,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadius,
                    color: colors.text,
                  },
                ]}
                value={notionalUsd}
                onChangeText={setNotionalUsd}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>
                Max Notional Cap (USD)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.border,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadius,
                    color: colors.text,
                  },
                ]}
                value={maxNotionalUsd}
                onChangeText={setMaxNotionalUsd}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>
                Rolling 24h Loss Ceiling (USD)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.border,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadius,
                    color: colors.text,
                  },
                ]}
                value={dailyLossLimitUsd}
                onChangeText={setDailyLossLimitUsd}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Notification Alerts */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusCard,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>
              ALERTS & NOTIFICATIONS
            </Text>

            <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Telegram Alerts</Text>
                <Text style={[styles.switchHint, { color: colors.textMuted }]}>
                  Dispatch signals to Telegram bot
                </Text>
              </View>
              <Switch
                value={tgEnabled}
                onValueChange={setTgEnabled}
                trackColor={{ false: colors.surface3, true: colors.primary }}
              />
            </View>

            {tgEnabled && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>
                  Telegram Chat ID
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.border,
                      borderWidth: colors.borderWidth,
                      borderRadius: colors.borderRadius,
                      color: colors.text,
                    },
                  ]}
                  value={tgChatId}
                  onChangeText={setTgChatId}
                  placeholder="e.g. 12345678"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
            )}

            <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Resend Email Alerts</Text>
                <Text style={[styles.switchHint, { color: colors.textMuted }]}>
                  Dispatch signals to email
                </Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ false: colors.surface3, true: colors.primary }}
              />
            </View>

            {emailEnabled && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>
                  Recipient Email
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.border,
                      borderWidth: colors.borderWidth,
                      borderRadius: colors.borderRadius,
                      color: colors.text,
                    },
                  ]}
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
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.borderRadius,
                borderWidth: colors.borderWidth,
                borderColor: colors.border,
              },
            ]}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: {
    fontWeight: '800',
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchHint: {
    fontSize: 11,
    marginTop: 2,
  },
  field: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  saveBtn: {
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
