import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native'
import {
  useTheme,
  THEME_STYLES,
  ThemeStyle,
  LayoutDensity,
  ChartCandles,
  RefreshInterval,
} from '../theme'

export const ThemeSelector: React.FC = () => {
  const {
    themeStyle,
    colorMode,
    colors,
    layoutDensity,
    chartCandles,
    refreshInterval,
    showIndicators,
    setThemeStyle,
    toggleColorMode,
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
      {/* Archetype & Color Mode */}
      <View style={styles.topRow}>
        <View style={styles.labelCol}>
          <Text style={[styles.title, { color: colors.text }]}>DESIGN ARCHETYPE & THEME</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {THEME_STYLES.find((t) => t.id === themeStyle)?.label} · {colorMode.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity
          onPress={toggleColorMode}
          activeOpacity={0.8}
          style={[
            styles.modeToggle,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.border,
              borderWidth: colors.borderWidth,
              borderRadius: colors.borderRadius,
            },
          ]}
        >
          <Text style={styles.modeIcon}>{colorMode === 'dark' ? '🌙' : '☀️'}</Text>
          <Text style={[styles.modeText, { color: colors.text }]}>
            {colorMode === 'dark' ? 'Dark' : 'Light'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4 Archetype Selectors */}
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
})
