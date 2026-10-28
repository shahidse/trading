import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native'
import {
  useTheme,
  THEME_STYLES,
  LIGHT_MODES,
  ThemeStyle,
  LayoutDensity,
  ChartCandles,
  RefreshInterval,
} from '../theme'

export interface ThemeSelectorProps {
  onClose?: () => void
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onClose }) => {
  const {
    themeStyle,
    colorMode,
    activeLightMode,
    colors,
    currency,
    pkrRate,
    layoutDensity,
    chartCandles,
    refreshInterval,
    showIndicators,
    setThemeStyle,
    setColorMode,
    toggleColorMode,
    cycleLightMode,
    setCurrency,
    setLayoutDensity,
    setChartCandles,
    setRefreshInterval,
    setShowIndicators,
  } = useTheme()

  const DENSITY_OPTIONS: Array<{ id: LayoutDensity; label: string; icon: string }> = [
    { id: 'compact', label: 'Compact', icon: '📱' },
    { id: 'comfortable', label: 'Balanced', icon: '📐' },
    { id: 'detailed', label: 'Detailed', icon: '🔬' },
  ]

  const CANDLE_OPTIONS: ChartCandles[] = [20, 32, 50]
  const INTERVAL_OPTIONS: Array<{ id: RefreshInterval; label: string }> = [
    { id: 0, label: 'Manual' },
    { id: 15, label: '15s' },
    { id: 30, label: '30s' },
    { id: 60, label: '60s' },
  ]

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
      {/* Top Header Row with Close if available */}
      <View style={styles.topRow}>
        <View style={styles.labelCol}>
          <Text style={[styles.title, { color: colors.text }]}>THEME & DISPLAY CONTROLS</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {THEME_STYLES.find((t) => t.id === themeStyle)?.label} · {colorMode.toUpperCase()} · {currency}
          </Text>
        </View>

        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.closeBtn,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.borderSubtle,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <Text style={[styles.closeBtnText, { color: colors.text }]}>✕ Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ALL 8 AMBIENT ROOM LIGHTING SETUPS (Synchronized with Web App) */}
      <View style={[styles.settingSection, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.modeSectionHeader}>
          <Text style={[styles.sectionHeading, { color: colors.textSubtle }]}>
            AMBIENT ROOM LIGHTING (8 SETUPS)
          </Text>
          <TouchableOpacity onPress={cycleLightMode}>
            <Text style={[styles.activeModePill, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
              {activeLightMode.icon} {activeLightMode.label} · ↻ Cycle
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.lightingGrid}>
          {LIGHT_MODES.map((mode) => {
            const isSelected = mode.id === colorMode
            return (
              <TouchableOpacity
                key={mode.id}
                activeOpacity={0.8}
                onPress={() => setColorMode(mode.id)}
                style={[
                  styles.lightingCard,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface2,
                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    borderWidth: isSelected ? 2 : colors.borderWidth,
                    borderRadius: colors.borderRadius,
                  },
                ]}
              >
                <View style={styles.modeCardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={[
                        styles.previewDot,
                        {
                          backgroundColor: mode.bgPreview,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    />
                    <Text style={styles.modeCardIcon}>{mode.icon}</Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkedBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.checkedText}>✓ ACTIVE</Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.modeCardTitle,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '800' : '700',
                    },
                  ]}
                >
                  {mode.label}
                </Text>
                <Text style={[styles.cardAmbientTitle, { color: colors.textSubtle }]}>
                  {mode.ambientTitle}
                </Text>
                <Text
                  style={[styles.modeCardDesc, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {mode.desc}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* CURRENCY VALUATION: USD vs PKR */}
      <View style={[styles.settingSection, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.modeSectionHeader}>
          <Text style={[styles.sectionHeading, { color: colors.textSubtle }]}>
            CURRENCY VALUATION
          </Text>
          <Text style={[styles.currencyRateNote, { color: colors.textSubtle }]}>
            1 USD ≈ ₨ {pkrRate.toFixed(2)} PKR
          </Text>
        </View>
        <View style={styles.optionRow}>
          <TouchableOpacity
            onPress={() => setCurrency('USD')}
            style={[
              styles.segmentBtn,
              {
                backgroundColor: currency === 'USD' ? colors.primaryLight : colors.surface2,
                borderColor: currency === 'USD' ? colors.primary : colors.borderSubtle,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <Text style={styles.segmentIcon}>💵</Text>
            <Text
              style={[
                styles.segmentText,
                { color: currency === 'USD' ? colors.primary : colors.textMuted, fontWeight: currency === 'USD' ? '800' : '600' },
              ]}
            >
              USD ($)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrency('PKR')}
            style={[
              styles.segmentBtn,
              {
                backgroundColor: currency === 'PKR' ? colors.primaryLight : colors.surface2,
                borderColor: currency === 'PKR' ? colors.primary : colors.borderSubtle,
                borderWidth: colors.borderWidth,
                borderRadius: colors.borderRadiusSm,
              },
            ]}
          >
            <Text style={styles.segmentIcon}>🇵🇰</Text>
            <Text
              style={[
                styles.segmentText,
                { color: currency === 'PKR' ? colors.primary : colors.textMuted, fontWeight: currency === 'PKR' ? '800' : '600' },
              ]}
            >
              PKR (₨)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Archetype Selectors */}
      <View style={[styles.settingSection, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionHeading, { color: colors.textSubtle }]}>
          DESIGN ARCHETYPES (ADAPTS TO {colorMode.toUpperCase()} MODE)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}
        >
          {THEME_STYLES.map((t) => {
            const isSelected = t.id === themeStyle
            return (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.8}
                onPress={() => setThemeStyle(t.id)}
                style={[
                  styles.themeTab,
                  {
                    borderRadius: colors.borderRadius,
                    borderWidth: colors.borderWidth,
                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface2,
                  },
                ]}
              >
                <Text style={styles.tabIcon}>{t.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isSelected ? colors.primary : colors.textMuted,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Layout Density */}
      <View style={[styles.settingSection, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionHeading, { color: colors.textSubtle }]}>LAYOUT DENSITY</Text>
        <View style={styles.optionRow}>
          {DENSITY_OPTIONS.map((opt) => {
            const active = opt.id === layoutDensity
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setLayoutDensity(opt.id)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.surface2,
                    borderColor: active ? colors.primary : colors.borderSubtle,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadiusSm,
                  },
                ]}
              >
                <Text style={styles.segmentIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '800' : '600' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Candlesticks on Chart */}
      <View style={[styles.settingSection, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionHeading, { color: colors.textSubtle }]}>CHART CANDLES (ZOOM)</Text>
        <View style={styles.optionRow}>
          {CANDLE_OPTIONS.map((count) => {
            const active = count === chartCandles
            return (
              <TouchableOpacity
                key={count}
                onPress={() => setChartCandles(count)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.surface2,
                    borderColor: active ? colors.primary : colors.borderSubtle,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadiusSm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '800' : '600' },
                  ]}
                >
                  {count} BARS
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Auto-Sync Rate */}
      <View style={[styles.settingSection, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.sectionHeading, { color: colors.textSubtle }]}>AUTO-SYNC RATE (DATA SAVER)</Text>
        <View style={styles.optionRow}>
          {INTERVAL_OPTIONS.map((opt) => {
            const active = opt.id === refreshInterval
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setRefreshInterval(opt.id)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: active ? colors.primaryLight : colors.surface2,
                    borderColor: active ? colors.primary : colors.borderSubtle,
                    borderWidth: colors.borderWidth,
                    borderRadius: colors.borderRadiusSm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '800' : '600' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Toggle Indicators List */}
      <View
        style={[
          styles.switchRow,
          { borderTopColor: colors.borderSubtle, borderTopWidth: 1 },
        ]}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Show Multi-Indicator Matrix</Text>
          <Text style={[styles.switchSub, { color: colors.textMuted }]}>
            Display the 9-indicator momentum & mean-reversion breakdown
          </Text>
        </View>
        <Switch
          value={showIndicators}
          onValueChange={setShowIndicators}
          trackColor={{ false: colors.surface3, true: colors.bullish }}
          thumbColor="#ffffff"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelCol: {
    flex: 1,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  modeIcon: {
    fontSize: 13,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollList: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
    marginBottom: 12,
  },
  themeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    fontSize: 12,
  },
  settingSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  segmentIcon: {
    fontSize: 12,
  },
  segmentText: {
    fontSize: 11,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 2,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  closeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeModePill: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  currencyRateNote: {
    fontSize: 10,
  },
  modeCardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    padding: 10,
  },
  modeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modeCardIcon: {
    fontSize: 18,
  },
  checkedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  checkedText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modeCardTitle: {
    fontSize: 12,
    marginBottom: 3,
  },
  modeCardDesc: {
    fontSize: 9.5,
    lineHeight: 13,
  },
  lightingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lightingCard: {
    width: '48.5%',
    padding: 10,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  cardAmbientTitle: {
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 2,
  },
})
