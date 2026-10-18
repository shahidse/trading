/**
 * 4 Multi-Archetype Design Themes with Full Light & Dark Support:
 *
 * 1. Sleek Data-Driven (Bloomberg Terminal / Pro Quant Trading)
 * 2. Neofuturistic & AI-Integrated Minimalism (Cyberpunk / Linear Synth / Cyan-Violet Glass)
 * 3. Playful Consumer-Grade (Social-Fi / Memecoin / Pump / Rounded Vibrant)
 * 4. High-Contrast Neo-Brutalism & Editorial (Bold Borders / Monospaced / Raw Contrasts)
 */
import React, { createContext, useContext, useState, ReactNode } from 'react'

export type ThemeStyle = 'data-driven' | 'neofuturistic' | 'playful' | 'brutalist'
export type ColorMode = 'dark' | 'light'

export interface ThemeColors {
  bg: string
  surface: string
  surface2: string
  surface3: string
  border: string
  borderSubtle: string

  // Accent & Brand
  primary: string
  primaryHover: string
  primaryLight: string

  // Market Directionals
  bullish: string
  bullishBg: string
  bullishBorder: string

  bearish: string
  bearishBg: string
  bearishBorder: string

  neutral: string
  neutralBg: string
  neutralBorder: string

  warning: string
  warningBg: string
  warningBorder: string

  // Text
  text: string
  textMuted: string
  textSubtle: string
  textDisabled: string

  // Trading Levels
  entry: string
  stopLoss: string
  takeProfit: string

  // Typography & Structural Geometry
  borderRadius: number
  borderRadiusSm: number
  borderRadiusCard: number
  borderWidth: number
  fontStyleBadge: 'default' | 'monospace' | 'uppercase'
  shadow: boolean
  accentGlow: string
}

export const themes: Record<ThemeStyle, Record<ColorMode, ThemeColors>> = {
  // 1. Sleek Data-Driven (Pro Quant / High Density / Financial Rigor)
  'data-driven': {
    dark: {
      bg: '#080c14',
      surface: '#0f172a',
      surface2: '#1e293b',
      surface3: '#334155',
      border: '#27354f',
      borderSubtle: '#182338',

      primary: '#38bdf8',
      primaryHover: '#0284c7',
      primaryLight: 'rgba(56, 189, 248, 0.12)',

      bullish: '#10b981',
      bullishBg: 'rgba(16, 185, 129, 0.14)',
      bullishBorder: 'rgba(16, 185, 129, 0.3)',

      bearish: '#f43f5e',
      bearishBg: 'rgba(244, 63, 94, 0.14)',
      bearishBorder: 'rgba(244, 63, 94, 0.3)',

      neutral: '#94a3b8',
      neutralBg: 'rgba(148, 163, 184, 0.12)',
      neutralBorder: 'rgba(148, 163, 184, 0.25)',

      warning: '#fbbf24',
      warningBg: 'rgba(251, 191, 36, 0.12)',
      warningBorder: 'rgba(251, 191, 36, 0.25)',

      text: '#f8fafc',
      textMuted: '#94a3b8',
      textSubtle: '#64748b',
      textDisabled: '#475569',

      entry: '#38bdf8',
      stopLoss: '#f43f5e',
      takeProfit: '#10b981',

      borderRadius: 8,
      borderRadiusSm: 6,
      borderRadiusCard: 10,
      borderWidth: 1,
      fontStyleBadge: 'uppercase',
      shadow: false,
      accentGlow: '#0284c7',
    },
    light: {
      bg: '#f1f5f9',
      surface: '#ffffff',
      surface2: '#f8fafc',
      surface3: '#e2e8f0',
      border: '#cbd5e1',
      borderSubtle: '#e2e8f0',

      primary: '#0284c7',
      primaryHover: '#0369a1',
      primaryLight: 'rgba(2, 132, 199, 0.1)',

      bullish: '#059669',
      bullishBg: 'rgba(5, 150, 105, 0.12)',
      bullishBorder: 'rgba(5, 150, 105, 0.3)',

      bearish: '#e11d48',
      bearishBg: 'rgba(225, 29, 72, 0.12)',
      bearishBorder: 'rgba(225, 29, 72, 0.3)',

      neutral: '#64748b',
      neutralBg: 'rgba(100, 116, 139, 0.1)',
      neutralBorder: 'rgba(100, 116, 139, 0.25)',

      warning: '#d97706',
      warningBg: 'rgba(217, 119, 6, 0.12)',
      warningBorder: 'rgba(217, 119, 6, 0.25)',

      text: '#0f172a',
      textMuted: '#475569',
      textSubtle: '#64748b',
      textDisabled: '#94a3b8',

      entry: '#0284c7',
      stopLoss: '#e11d48',
      takeProfit: '#059669',

      borderRadius: 8,
      borderRadiusSm: 6,
      borderRadiusCard: 10,
      borderWidth: 1,
      fontStyleBadge: 'uppercase',
      shadow: false,
      accentGlow: '#38bdf8',
    },
  },

  // 2. Neofuturistic & AI-Integrated Minimalism (Cyber-Glass / Cyan-Violet Matrix)
  'neofuturistic': {
    dark: {
      bg: '#050711',
      surface: '#0b1124',
      surface2: '#131c38',
      surface3: '#1f2b52',
      border: '#2a3a6b',
      borderSubtle: '#192445',

      primary: '#a855f7',
      primaryHover: '#9333ea',
      primaryLight: 'rgba(168, 85, 247, 0.16)',

      bullish: '#06b6d4',
      bullishBg: 'rgba(6, 182, 212, 0.15)',
      bullishBorder: 'rgba(6, 182, 212, 0.4)',

      bearish: '#ec4899',
      bearishBg: 'rgba(236, 72, 153, 0.15)',
      bearishBorder: 'rgba(236, 72, 153, 0.4)',

      neutral: '#818cf8',
      neutralBg: 'rgba(129, 140, 248, 0.12)',
      neutralBorder: 'rgba(129, 140, 248, 0.3)',

      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.14)',
      warningBorder: 'rgba(245, 158, 11, 0.3)',

      text: '#ffffff',
      textMuted: '#cbd5e1',
      textSubtle: '#64748b',
      textDisabled: '#475569',

      entry: '#06b6d4',
      stopLoss: '#ec4899',
      takeProfit: '#a855f7',

      borderRadius: 14,
      borderRadiusSm: 10,
      borderRadiusCard: 18,
      borderWidth: 1.5,
      fontStyleBadge: 'default',
      shadow: true,
      accentGlow: '#a855f7',
    },
    light: {
      bg: '#f8fafc',
      surface: '#ffffff',
      surface2: '#f1f5f9',
      surface3: '#e0e7ff',
      border: '#cbd5e1',
      borderSubtle: '#e2e8f0',

      primary: '#7c3aed',
      primaryHover: '#6d28d9',
      primaryLight: 'rgba(124, 58, 237, 0.12)',

      bullish: '#0891b2',
      bullishBg: 'rgba(8, 145, 178, 0.12)',
      bullishBorder: 'rgba(8, 145, 178, 0.35)',

      bearish: '#db2777',
      bearishBg: 'rgba(219, 39, 119, 0.12)',
      bearishBorder: 'rgba(219, 39, 119, 0.35)',

      neutral: '#6366f1',
      neutralBg: 'rgba(99, 102, 241, 0.1)',
      neutralBorder: 'rgba(99, 102, 241, 0.25)',

      warning: '#d97706',
      warningBg: 'rgba(217, 119, 6, 0.12)',
      warningBorder: 'rgba(217, 119, 6, 0.25)',

      text: '#090d16',
      textMuted: '#475569',
      textSubtle: '#64748b',
      textDisabled: '#94a3b8',

      entry: '#0891b2',
      stopLoss: '#db2777',
      takeProfit: '#7c3aed',

      borderRadius: 14,
      borderRadiusSm: 10,
      borderRadiusCard: 18,
      borderWidth: 1.5,
      fontStyleBadge: 'default',
      shadow: true,
      accentGlow: '#7c3aed',
    },
  },

  // 3. Playful Consumer-Grade (Social-Fi & Memecoin / High Saturation / Pill Shapes)
  'playful': {
    dark: {
      bg: '#13111c',
      surface: '#1e1a2e',
      surface2: '#2a2440',
      surface3: '#383057',
      border: '#433869',
      borderSubtle: '#2a2342',

      primary: '#ff007a',
      primaryHover: '#e6006e',
      primaryLight: 'rgba(255, 0, 122, 0.18)',

      bullish: '#00e676',
      bullishBg: 'rgba(0, 230, 118, 0.18)',
      bullishBorder: 'rgba(0, 230, 118, 0.45)',

      bearish: '#ff3d71',
      bearishBg: 'rgba(255, 61, 113, 0.18)',
      bearishBorder: 'rgba(255, 61, 113, 0.45)',

      neutral: '#a78bfa',
      neutralBg: 'rgba(167, 139, 250, 0.15)',
      neutralBorder: 'rgba(167, 139, 250, 0.35)',

      warning: '#ffb300',
      warningBg: 'rgba(255, 179, 0, 0.18)',
      warningBorder: 'rgba(255, 179, 0, 0.45)',

      text: '#ffffff',
      textMuted: '#e2d9f3',
      textSubtle: '#9d8ec2',
      textDisabled: '#6b5e8c',

      entry: '#00d2ff',
      stopLoss: '#ff3d71',
      takeProfit: '#00e676',

      borderRadius: 22,
      borderRadiusSm: 16,
      borderRadiusCard: 26,
      borderWidth: 2,
      fontStyleBadge: 'default',
      shadow: true,
      accentGlow: '#ff007a',
    },
    light: {
      bg: '#fff7fc',
      surface: '#ffffff',
      surface2: '#fdf2f8',
      surface3: '#fce7f3',
      border: '#fbcfe8',
      borderSubtle: '#fdf2f8',

      primary: '#ec4899',
      primaryHover: '#db2777',
      primaryLight: 'rgba(236, 72, 153, 0.15)',

      bullish: '#10b981',
      bullishBg: 'rgba(16, 185, 129, 0.15)',
      bullishBorder: 'rgba(16, 185, 129, 0.35)',

      bearish: '#f43f5e',
      bearishBg: 'rgba(244, 63, 94, 0.15)',
      bearishBorder: 'rgba(244, 63, 94, 0.35)',

      neutral: '#8b5cf6',
      neutralBg: 'rgba(139, 92, 246, 0.12)',
      neutralBorder: 'rgba(139, 92, 246, 0.3)',

      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.15)',
      warningBorder: 'rgba(245, 158, 11, 0.35)',

      text: '#2e1065',
      textMuted: '#6b21a8',
      textSubtle: '#9333ea',
      textDisabled: '#c084fc',

      entry: '#06b6d4',
      stopLoss: '#f43f5e',
      takeProfit: '#10b981',

      borderRadius: 22,
      borderRadiusSm: 16,
      borderRadiusCard: 26,
      borderWidth: 2,
      fontStyleBadge: 'default',
      shadow: true,
      accentGlow: '#ec4899',
    },
  },

  // 4. High-Contrast Neo-Brutalism & Editorial (Stark Lines, Thick 3px Borders, Raw Contrast)
  'brutalist': {
    dark: {
      bg: '#000000',
      surface: '#121212',
      surface2: '#1f1f1f',
      surface3: '#2d2d2d',
      border: '#ffffff',
      borderSubtle: '#737373',

      primary: '#fbbf24',
      primaryHover: '#f59e0b',
      primaryLight: 'rgba(251, 191, 36, 0.25)',

      bullish: '#22c55e',
      bullishBg: 'rgba(34, 197, 94, 0.25)',
      bullishBorder: '#22c55e',

      bearish: '#ef4444',
      bearishBg: 'rgba(239, 68, 68, 0.25)',
      bearishBorder: '#ef4444',

      neutral: '#ffffff',
      neutralBg: 'rgba(255, 255, 255, 0.15)',
      neutralBorder: '#ffffff',

      warning: '#facc15',
      warningBg: 'rgba(250, 204, 21, 0.25)',
      warningBorder: '#facc15',

      text: '#ffffff',
      textMuted: '#e5e5e5',
      textSubtle: '#a3a3a3',
      textDisabled: '#525252',

      entry: '#38bdf8',
      stopLoss: '#ef4444',
      takeProfit: '#22c55e',

      borderRadius: 2,
      borderRadiusSm: 0,
      borderRadiusCard: 4,
      borderWidth: 2.5,
      fontStyleBadge: 'monospace',
      shadow: true,
      accentGlow: '#fbbf24',
    },
    light: {
      bg: '#fffae5',
      surface: '#ffffff',
      surface2: '#fffbeb',
      surface3: '#fef3c7',
      border: '#000000',
      borderSubtle: '#404040',

      primary: '#000000',
      primaryHover: '#262626',
      primaryLight: 'rgba(0, 0, 0, 0.12)',

      bullish: '#15803d',
      bullishBg: '#dcfce7',
      bullishBorder: '#000000',

      bearish: '#b91c1c',
      bearishBg: '#fee2e2',
      bearishBorder: '#000000',

      neutral: '#000000',
      neutralBg: '#f5f5f5',
      neutralBorder: '#000000',

      warning: '#b45309',
      warningBg: '#fef3c7',
      warningBorder: '#000000',

      text: '#000000',
      textMuted: '#171717',
      textSubtle: '#404040',
      textDisabled: '#737373',

      entry: '#0284c7',
      stopLoss: '#b91c1c',
      takeProfit: '#15803d',

      borderRadius: 2,
      borderRadiusSm: 0,
      borderRadiusCard: 4,
      borderWidth: 2.5,
      fontStyleBadge: 'monospace',
      shadow: true,
      accentGlow: '#000000',
    },
  },
}

// Global mutable colors pointing to the active theme for backwards compatibility
export let colors: ThemeColors = themes['data-driven'].dark

export const THEME_STYLES: Array<{ id: ThemeStyle; label: string; icon: string }> = [
  { id: 'data-driven', label: 'Data-Driven', icon: '📊' },
  { id: 'neofuturistic', label: 'Neofuture AI', icon: '⚡' },
  { id: 'playful', label: 'Playful Social-Fi', icon: '🚀' },
  { id: 'brutalist', label: 'Neo-Brutalist', icon: '📐' },
]

interface ThemeContextValue {
  themeStyle: ThemeStyle
  colorMode: ColorMode
  colors: ThemeColors
  setThemeStyle: (style: ThemeStyle) => void
  setColorMode: (mode: ColorMode) => void
  toggleColorMode: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  themeStyle: 'data-driven',
  colorMode: 'dark',
  colors: themes['data-driven'].dark,
  setThemeStyle: () => {},
  setColorMode: () => {},
  toggleColorMode: () => {},
})

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>('data-driven')
  const [colorMode, setColorMode] = useState<ColorMode>('dark')

  const activeColors = themes[themeStyle][colorMode]
  // Update export reference for unhooked utilities
  colors = activeColors

  const toggleColorMode = () => {
    setColorMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider
      value={{
        themeStyle,
        colorMode,
        colors: activeColors,
        setThemeStyle,
        setColorMode,
        toggleColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

// Formatters
export const formatPrice = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '—'
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatPercent = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return '—'
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}
