import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useTheme, THEME_STYLES, ThemeStyle } from '../theme'

export const ThemeSelector: React.FC = () => {
  const { themeStyle, colorMode, colors, setThemeStyle, toggleColorMode } = useTheme()

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
      <View style={styles.topRow}>
        <View style={styles.labelCol}>
          <Text style={[styles.title, { color: colors.text }]}>DESIGN ARCHETYPE</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {THEME_STYLES.find((t) => t.id === themeStyle)?.label} · {colorMode.toUpperCase()}
          </Text>
        </View>

        {/* Dark / Light Toggle Button */}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
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
})
