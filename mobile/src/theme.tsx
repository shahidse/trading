/**
 * Multi-Archetype & 8 Ambient Lighting Systems for Mobile
 *
 * Synchronized with Web Theme System:
 *
 * 8 Ambient Lighting Modes (LIGHT_MODES):
 * 1. light: Daylight ☀️ (Full Sun / Day - crisp bright daylight)
 * 2. warm-light: Eye-Care Paper 📖 (Warm Room / Paper - soft sepia, zero strain)
 * 3. candlelight: Candlelight 🕯️ (Golden 1800K Hearth - ultra-warm caramel amber)
 * 4. aurora-glow: Aurora Glow ✨ (Glacial Borealis - luminous emerald & arctic cyan)
 * 5. cyber-glow: Cyber Cockpit ⚡ (Electric Neon Horizon - radiant purple & mint glow)
 * 6. dusk: Twilight Dim 🌆 (Dim Ambient / Sunset - muted charcoal slate)
 * 7. dark: Midnight 🌙 (Night Pro - classic deep navy dark mode)
 * 8. oled: OLED Zero 🖤 (Pitch Black / Zero Glow - true #000000 black)
 *
 * 4 Core Design Archetypes (THEME_STYLES):
 * 1. data-driven: Sleek Data-Driven (Bloomberg Terminal / Pro Quant Trading)
 * 2. neofuturistic: Neofuturistic & AI-Integrated Minimalism (Cyberpunk / Linear Synth)
 * 3. playful: Playful Consumer-Grade (Social-Fi / Memecoin / Rounded Vibrant)
 * 4. brutalist: High-Contrast Neo-Brutalism & Editorial (Bold Borders / Monospaced)
 */
import React, { createContext, useContext, useState, ReactNode } from 'react'

export type ThemeStyle = 'data-driven' | 'neofuturistic' | 'playful' | 'brutalist'

export type ColorMode =
  | 'light'
  | 'warm-light'
  | 'candlelight'
  | 'aurora-glow'
  | 'cyber-glow'
  | 'dusk'
  | 'dark'
  | 'oled'

export interface LightModeOption {
  id: ColorMode
  label: string
  ambientTitle: string
  desc: string
  icon: string
  bgPreview: string
  isLightTone: boolean
}

export const LIGHT_MODES: LightModeOption[] = [
  {
    id: 'light',
    label: 'Daylight',
    ambientTitle: 'Full Sun / Day',
    desc: 'Crisp bright daylight for sunlit spaces',
    icon: '☀️',
    bgPreview: '#ffffff',
    isLightTone: true,
  },
  {
    id: 'warm-light',
    label: 'Eye-Care Paper',
    ambientTitle: 'Warm Room / Paper',
    desc: 'Soft sepia paper, gentle on eyes',
    icon: '📖',
    bgPreview: '#fbf7ee',
    isLightTone: true,
  },
  {
    id: 'candlelight',
    label: 'Candlelight',
    ambientTitle: 'Golden 1800K Hearth',
    desc: 'Ultra-warm caramel amber, 0% eye strain',
    icon: '🕯️',
    bgPreview: '#160f08',
    isLightTone: false,
  },
  {
    id: 'aurora-glow',
    label: 'Aurora Glow',
    ambientTitle: 'Glacial Borealis Glow',
    desc: 'Luminous polar emerald & arctic violet',
    icon: '✨',
    bgPreview: '#051824',
    isLightTone: false,
  },
  {
    id: 'cyber-glow',
    label: 'Cyber Cockpit',
    ambientTitle: 'Electric Neon Horizon',
    desc: 'Deep cyber terminal with radiant neon glow',
    icon: '⚡',
    bgPreview: '#060a17',
    isLightTone: false,
  },
  {
    id: 'dusk',
    label: 'Twilight Dim',
    ambientTitle: 'Dim Ambient / Sunset',
    desc: 'Muted charcoal slate for low lighting',
    icon: '🌆',
    bgPreview: '#1e2430',
    isLightTone: false,
  },
  {
    id: 'dark',
    label: 'Midnight',
    ambientTitle: 'Night Pro',
    desc: 'Classic deep navy dark mode',
    icon: '🌙',
    bgPreview: '#080c14',
    isLightTone: false,
  },
  {
    id: 'oled',
    label: 'OLED Zero',
    ambientTitle: 'Pitch Black / Zero Glow',
    desc: 'Pure #000000 true black for dark rooms',
    icon: '🖤',
    bgPreview: '#000000',
    isLightTone: false,
  },
]

export const isLightMode = (mode: ColorMode): boolean => {
  return mode === 'light' || mode === 'warm-light'
}

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

type StyleGeometry = Pick<
  ThemeColors,
  | 'borderRadius'
  | 'borderRadiusSm'
  | 'borderRadiusCard'
  | 'borderWidth'
  | 'fontStyleBadge'
  | 'shadow'
  | 'accentGlow'
>

const GEOMETRIES: Record<ThemeStyle, StyleGeometry> = {
  'data-driven': {
    borderRadius: 8,
    borderRadiusSm: 6,
    borderRadiusCard: 10,
    borderWidth: 1,
    fontStyleBadge: 'uppercase',
    shadow: false,
    accentGlow: '#0284c7',
  },
  'neofuturistic': {
    borderRadius: 14,
    borderRadiusSm: 10,
    borderRadiusCard: 18,
    borderWidth: 1.5,
    fontStyleBadge: 'default',
    shadow: true,
    accentGlow: '#a855f7',
  },
  'playful': {
    borderRadius: 22,
    borderRadiusSm: 16,
    borderRadiusCard: 26,
    borderWidth: 2,
    fontStyleBadge: 'default',
    shadow: true,
    accentGlow: '#ff007a',
  },
  'brutalist': {
    borderRadius: 2,
    borderRadiusSm: 0,
    borderRadiusCard: 4,
    borderWidth: 2.5,
    fontStyleBadge: 'monospace',
    shadow: true,
    accentGlow: '#fbbf24',
  },
}

function buildPalette(style: ThemeStyle, mode: ColorMode): ThemeColors {
  const geo = GEOMETRIES[style]

  // Base lighting environment definitions
  if (mode === 'light') {
    return {
      ...geo,
      bg: '#f1f5f9',
      surface: '#ffffff',
      surface2: '#f8fafc',
      surface3: '#e2e8f0',
      border: style === 'brutalist' ? '#000000' : '#cbd5e1',
      borderSubtle: style === 'brutalist' ? '#525252' : '#e2e8f0',

      primary: style === 'neofuturistic' ? '#7c3aed' : style === 'playful' ? '#ec4899' : style === 'brutalist' ? '#000000' : '#0284c7',
      primaryHover: style === 'neofuturistic' ? '#6d28d9' : style === 'playful' ? '#db2777' : style === 'brutalist' ? '#262626' : '#0369a1',
      primaryLight: style === 'playful' ? 'rgba(236, 72, 153, 0.14)' : 'rgba(2, 132, 199, 0.1)',

      bullish: '#059669',
      bullishBg: 'rgba(5, 150, 105, 0.12)',
      bullishBorder: style === 'brutalist' ? '#000000' : 'rgba(5, 150, 105, 0.3)',

      bearish: '#e11d48',
      bearishBg: 'rgba(225, 29, 72, 0.12)',
      bearishBorder: style === 'brutalist' ? '#000000' : 'rgba(225, 29, 72, 0.3)',

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
    }
  }

  if (mode === 'warm-light') {
    return {
      ...geo,
      bg: '#f4ede1',
      surface: '#fbf7ee',
      surface2: '#f0e6d6',
      surface3: '#e5d9c5',
      border: style === 'brutalist' ? '#292116' : '#d7cbb5',
      borderSubtle: style === 'brutalist' ? '#6e5d48' : '#e6dcce',

      primary: style === 'neofuturistic' ? '#6d28d9' : style === 'playful' ? '#db2777' : style === 'brutalist' ? '#292116' : '#0369a1',
      primaryHover: '#075985',
      primaryLight: 'rgba(3, 105, 161, 0.12)',

      bullish: '#15803d',
      bullishBg: 'rgba(21, 128, 61, 0.12)',
      bullishBorder: style === 'brutalist' ? '#292116' : 'rgba(21, 128, 61, 0.3)',

      bearish: '#b91c1c',
      bearishBg: 'rgba(185, 28, 28, 0.12)',
      bearishBorder: style === 'brutalist' ? '#292116' : 'rgba(185, 28, 28, 0.3)',

      neutral: '#786951',
      neutralBg: 'rgba(120, 105, 81, 0.12)',
      neutralBorder: 'rgba(120, 105, 81, 0.25)',

      warning: '#b45309',
      warningBg: 'rgba(180, 83, 9, 0.12)',
      warningBorder: 'rgba(180, 83, 9, 0.25)',

      text: '#292116',
      textMuted: '#5e4e39',
      textSubtle: '#8a765d',
      textDisabled: '#b5a58f',

      entry: '#0369a1',
      stopLoss: '#b91c1c',
      takeProfit: '#15803d',
    }
  }

  if (mode === 'candlelight') {
    return {
      ...geo,
      bg: '#140c06',
      surface: '#20150d',
      surface2: '#2c1e14',
      surface3: '#3d2b1d',
      border: style === 'brutalist' ? '#f59e0b' : '#533a28',
      borderSubtle: style === 'brutalist' ? '#8c5e38' : '#362418',

      primary: '#f59e0b',
      primaryHover: '#d97706',
      primaryLight: 'rgba(245, 158, 11, 0.18)',

      bullish: '#10b981',
      bullishBg: 'rgba(16, 185, 129, 0.16)',
      bullishBorder: 'rgba(16, 185, 129, 0.35)',

      bearish: '#f43f5e',
      bearishBg: 'rgba(244, 63, 94, 0.16)',
      bearishBorder: 'rgba(244, 63, 94, 0.35)',

      neutral: '#d97706',
      neutralBg: 'rgba(217, 119, 6, 0.14)',
      neutralBorder: 'rgba(217, 119, 6, 0.3)',

      warning: '#fbbf24',
      warningBg: 'rgba(251, 191, 36, 0.18)',
      warningBorder: 'rgba(251, 191, 36, 0.35)',

      text: '#fef3c7',
      textMuted: '#fde68a',
      textSubtle: '#d97706',
      textDisabled: '#92400e',

      entry: '#f59e0b',
      stopLoss: '#f43f5e',
      takeProfit: '#10b981',
    }
  }

  if (mode === 'aurora-glow') {
    return {
      ...geo,
      bg: '#04131d',
      surface: '#082538',
      surface2: '#0e344d',
      surface3: '#154566',
      border: style === 'brutalist' ? '#38bdf8' : '#1f5f8b',
      borderSubtle: style === 'brutalist' ? '#0284c7' : '#103954',

      primary: '#38bdf8',
      primaryHover: '#0284c7',
      primaryLight: 'rgba(56, 189, 248, 0.18)',

      bullish: '#34d399',
      bullishBg: 'rgba(52, 211, 153, 0.18)',
      bullishBorder: 'rgba(52, 211, 153, 0.4)',

      bearish: '#f43f5e',
      bearishBg: 'rgba(244, 63, 94, 0.16)',
      bearishBorder: 'rgba(244, 63, 94, 0.35)',

      neutral: '#38bdf8',
      neutralBg: 'rgba(56, 189, 248, 0.14)',
      neutralBorder: 'rgba(56, 189, 248, 0.3)',

      warning: '#facc15',
      warningBg: 'rgba(250, 204, 21, 0.15)',
      warningBorder: 'rgba(250, 204, 21, 0.3)',

      text: '#e0f2fe',
      textMuted: '#7dd3fc',
      textSubtle: '#38bdf8',
      textDisabled: '#0369a1',

      entry: '#38bdf8',
      stopLoss: '#f43f5e',
      takeProfit: '#34d399',
    }
  }

  if (mode === 'cyber-glow') {
    return {
      ...geo,
      bg: '#050716',
      surface: '#0b1029',
      surface2: '#121a3f',
      surface3: '#1a2657',
      border: style === 'brutalist' ? '#00f5d4' : '#293a7d',
      borderSubtle: style === 'brutalist' ? '#00b4d8' : '#16214d',

      primary: '#a855f7',
      primaryHover: '#9333ea',
      primaryLight: 'rgba(168, 85, 247, 0.2)',

      bullish: '#00f5d4',
      bullishBg: 'rgba(0, 245, 212, 0.18)',
      bullishBorder: 'rgba(0, 245, 212, 0.4)',

      bearish: '#ec4899',
      bearishBg: 'rgba(236, 72, 153, 0.18)',
      bearishBorder: 'rgba(236, 72, 153, 0.4)',

      neutral: '#818cf8',
      neutralBg: 'rgba(129, 140, 248, 0.14)',
      neutralBorder: 'rgba(129, 140, 248, 0.3)',

      warning: '#fbbf24',
      warningBg: 'rgba(251, 191, 36, 0.15)',
      warningBorder: 'rgba(251, 191, 36, 0.3)',

      text: '#ffffff',
      textMuted: '#c7d2fe',
      textSubtle: '#818cf8',
      textDisabled: '#4f46e5',

      entry: '#00f5d4',
      stopLoss: '#ec4899',
      takeProfit: '#a855f7',
    }
  }

  if (mode === 'dusk') {
    return {
      ...geo,
      bg: '#181d28',
      surface: '#202736',
      surface2: '#2b3447',
      surface3: '#38435b',
      border: style === 'brutalist' ? '#ffffff' : '#45536e',
      borderSubtle: style === 'brutalist' ? '#8895ad' : '#2a3447',

      primary: style === 'neofuturistic' ? '#a855f7' : style === 'playful' ? '#ff007a' : '#38bdf8',
      primaryHover: '#0284c7',
      primaryLight: 'rgba(56, 189, 248, 0.14)',

      bullish: '#10b981',
      bullishBg: 'rgba(16, 185, 129, 0.15)',
      bullishBorder: 'rgba(16, 185, 129, 0.35)',

      bearish: '#f43f5e',
      bearishBg: 'rgba(244, 63, 94, 0.15)',
      bearishBorder: 'rgba(244, 63, 94, 0.35)',

      neutral: '#94a3b8',
      neutralBg: 'rgba(148, 163, 184, 0.12)',
      neutralBorder: 'rgba(148, 163, 184, 0.25)',

      warning: '#fbbf24',
      warningBg: 'rgba(251, 191, 36, 0.14)',
      warningBorder: 'rgba(251, 191, 36, 0.3)',

      text: '#e2e8f0',
      textMuted: '#94a3b8',
      textSubtle: '#64748b',
      textDisabled: '#475569',

      entry: '#38bdf8',
      stopLoss: '#f43f5e',
      takeProfit: '#10b981',
    }
  }

  if (mode === 'oled') {
    return {
      ...geo,
      bg: '#000000',
      surface: '#0a0a0a',
      surface2: '#141414',
      surface3: '#202020',
      border: style === 'brutalist' ? '#ffffff' : '#333333',
      borderSubtle: style === 'brutalist' ? '#888888' : '#222222',

      primary: style === 'neofuturistic' ? '#c084fc' : style === 'playful' ? '#ff007a' : style === 'brutalist' ? '#fbbf24' : '#38bdf8',
      primaryHover: '#0284c7',
      primaryLight: 'rgba(56, 189, 248, 0.18)',

      bullish: '#22c55e',
      bullishBg: 'rgba(34, 197, 94, 0.18)',
      bullishBorder: '#22c55e',

      bearish: '#ef4444',
      bearishBg: 'rgba(239, 68, 68, 0.18)',
      bearishBorder: '#ef4444',

      neutral: '#ffffff',
      neutralBg: 'rgba(255, 255, 255, 0.12)',
      neutralBorder: '#ffffff',

      warning: '#facc15',
      warningBg: 'rgba(250, 204, 21, 0.2)',
      warningBorder: '#facc15',

      text: '#ffffff',
      textMuted: '#e5e5e5',
      textSubtle: '#a3a3a3',
      textDisabled: '#525252',

      entry: '#38bdf8',
      stopLoss: '#ef4444',
      takeProfit: '#22c55e',
    }
  }

  // Default 'dark' (Midnight / Night Pro)
  return {
    ...geo,
    bg: '#080c14',
    surface: '#0f172a',
    surface2: '#1e293b',
    surface3: '#334155',
    border: style === 'brutalist' ? '#ffffff' : '#27354f',
    borderSubtle: style === 'brutalist' ? '#737373' : '#182338',

    primary: style === 'neofuturistic' ? '#a855f7' : style === 'playful' ? '#ff007a' : style === 'brutalist' ? '#fbbf24' : '#38bdf8',
    primaryHover: style === 'neofuturistic' ? '#9333ea' : style === 'playful' ? '#e6006e' : style === 'brutalist' ? '#f59e0b' : '#0284c7',
    primaryLight: style === 'neofuturistic' ? 'rgba(168, 85, 247, 0.16)' : style === 'playful' ? 'rgba(255, 0, 122, 0.18)' : 'rgba(56, 189, 248, 0.12)',

    bullish: style === 'neofuturistic' ? '#06b6d4' : style === 'playful' ? '#00e676' : '#10b981',
    bullishBg: 'rgba(16, 185, 129, 0.14)',
    bullishBorder: 'rgba(16, 185, 129, 0.3)',

    bearish: style === 'neofuturistic' ? '#ec4899' : style === 'playful' ? '#ff3d71' : '#f43f5e',
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
  }
}

export const themes: Record<ThemeStyle, Record<ColorMode, ThemeColors>> = {
  'data-driven': {
    light: buildPalette('data-driven', 'light'),
    'warm-light': buildPalette('data-driven', 'warm-light'),
    candlelight: buildPalette('data-driven', 'candlelight'),
    'aurora-glow': buildPalette('data-driven', 'aurora-glow'),
    'cyber-glow': buildPalette('data-driven', 'cyber-glow'),
    dusk: buildPalette('data-driven', 'dusk'),
    dark: buildPalette('data-driven', 'dark'),
    oled: buildPalette('data-driven', 'oled'),
  },
  'neofuturistic': {
    light: buildPalette('neofuturistic', 'light'),
    'warm-light': buildPalette('neofuturistic', 'warm-light'),
    candlelight: buildPalette('neofuturistic', 'candlelight'),
    'aurora-glow': buildPalette('neofuturistic', 'aurora-glow'),
    'cyber-glow': buildPalette('neofuturistic', 'cyber-glow'),
    dusk: buildPalette('neofuturistic', 'dusk'),
    dark: buildPalette('neofuturistic', 'dark'),
    oled: buildPalette('neofuturistic', 'oled'),
  },
  'playful': {
    light: buildPalette('playful', 'light'),
    'warm-light': buildPalette('playful', 'warm-light'),
    candlelight: buildPalette('playful', 'candlelight'),
    'aurora-glow': buildPalette('playful', 'aurora-glow'),
    'cyber-glow': buildPalette('playful', 'cyber-glow'),
    dusk: buildPalette('playful', 'dusk'),
    dark: buildPalette('playful', 'dark'),
    oled: buildPalette('playful', 'oled'),
  },
  'brutalist': {
    light: buildPalette('brutalist', 'light'),
    'warm-light': buildPalette('brutalist', 'warm-light'),
    candlelight: buildPalette('brutalist', 'candlelight'),
    'aurora-glow': buildPalette('brutalist', 'aurora-glow'),
    'cyber-glow': buildPalette('brutalist', 'cyber-glow'),
    dusk: buildPalette('brutalist', 'dusk'),
    dark: buildPalette('brutalist', 'dark'),
    oled: buildPalette('brutalist', 'oled'),
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

export type LayoutDensity = 'compact' | 'comfortable' | 'detailed'
export type ChartCandles = 20 | 32 | 50
export type RefreshInterval = 0 | 15 | 30 | 60
export type CurrencyMode = 'USD' | 'PKR'

export const DEFAULT_PKR_RATE = 278.50

export interface ThemeContextValue {
  themeStyle: ThemeStyle
  colorMode: ColorMode
  activeLightMode: LightModeOption
  colors: ThemeColors
  currency: CurrencyMode
  pkrRate: number
  isLightTone: boolean
  layoutDensity: LayoutDensity
  chartCandles: ChartCandles
  refreshInterval: RefreshInterval
  showIndicators: boolean
  setThemeStyle: (style: ThemeStyle) => void
  setColorMode: (mode: ColorMode) => void
  toggleColorMode: () => void
  cycleLightMode: () => void
  setCurrency: (c: CurrencyMode) => void
  toggleCurrency: () => void
  setLayoutDensity: (density: LayoutDensity) => void
  setChartCandles: (candles: ChartCandles) => void
  setRefreshInterval: (seconds: RefreshInterval) => void
  setShowIndicators: (show: boolean) => void
  formatCurrency: (val: number | null | undefined, compact?: boolean) => string
  formatPrice: (val: number | null | undefined, decimals?: number) => string
}

const defaultLightMode = LIGHT_MODES[6] // 'dark'

const ThemeContext = createContext<ThemeContextValue>({
  themeStyle: 'data-driven',
  colorMode: 'dark',
  activeLightMode: defaultLightMode,
  colors: themes['data-driven'].dark,
  currency: 'USD',
  pkrRate: DEFAULT_PKR_RATE,
  isLightTone: false,
  layoutDensity: 'comfortable',
  chartCandles: 32,
  refreshInterval: 30,
  showIndicators: true,
  setThemeStyle: () => {},
  setColorMode: () => {},
  toggleColorMode: () => {},
  cycleLightMode: () => {},
  setCurrency: () => {},
  toggleCurrency: () => {},
  setLayoutDensity: () => {},
  setChartCandles: () => {},
  setRefreshInterval: () => {},
  setShowIndicators: () => {},
  formatCurrency: (val) => formatUsd(val ?? 0),
  formatPrice: (val, decimals) => formatPrice(val, decimals),
})

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>('data-driven')
  const [colorMode, setColorMode] = useState<ColorMode>('dark')
  const [currency, setCurrency] = useState<CurrencyMode>('USD')
  const [pkrRate] = useState<number>(DEFAULT_PKR_RATE)
  const [layoutDensity, setLayoutDensity] = useState<LayoutDensity>('comfortable')
  const [chartCandles, setChartCandles] = useState<ChartCandles>(32)
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(30)
  const [showIndicators, setShowIndicators] = useState<boolean>(true)

  const activeColors = themes[themeStyle][colorMode] || themes['data-driven'].dark
  // Update export reference for unhooked utilities
  colors = activeColors

  const activeLightMode = LIGHT_MODES.find((m) => m.id === colorMode) || defaultLightMode
  const isLightTone = isLightMode(colorMode)

  const cycleLightMode = () => {
    const modes: ColorMode[] = [
      'light',
      'warm-light',
      'candlelight',
      'aurora-glow',
      'cyber-glow',
      'dusk',
      'dark',
      'oled',
    ]
    const nextIdx = (modes.indexOf(colorMode) + 1) % modes.length
    setColorMode(modes[nextIdx])
  }

  const toggleColorMode = () => {
    // Quick flip between Daylight and Midnight
    setColorMode((prev) => (isLightMode(prev) ? 'dark' : 'light'))
  }

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === 'USD' ? 'PKR' : 'USD'))
  }

  const formatCurrencyHook = (val: number | null | undefined, compact = false): string => {
    return formatCurrency(val, currency, pkrRate, compact)
  }

  const formatPriceHook = (val: number | null | undefined, decimals?: number): string => {
    return formatPrice(val, decimals, currency, pkrRate)
  }

  return (
    <ThemeContext.Provider
      value={{
        themeStyle,
        colorMode,
        activeLightMode,
        colors: activeColors,
        currency,
        pkrRate,
        isLightTone,
        layoutDensity,
        chartCandles,
        refreshInterval,
        showIndicators,
        setThemeStyle,
        setColorMode,
        toggleColorMode,
        cycleLightMode,
        setCurrency,
        toggleCurrency,
        setLayoutDensity,
        setChartCandles,
        setRefreshInterval,
        setShowIndicators,
        formatCurrency: formatCurrencyHook,
        formatPrice: formatPriceHook,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

// Formatters & Currency Math
export const usdToPkr = (amountUsd: number, rate = DEFAULT_PKR_RATE): number => {
  return amountUsd * rate
}

export const formatUsd = (amount: number | null | undefined, compact = false): string => {
  if (amount == null || !Number.isFinite(amount)) return '$0.00'
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`
  }
  if (compact && Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`
  }
  if (amount < 0.0001 && amount > 0) {
    return `$${amount.toFixed(8)}`
  }
  if (amount < 0.01 && amount > 0) {
    return `$${amount.toFixed(6)}`
  }
  if (amount < 1 && amount > 0) {
    return `$${amount.toFixed(4)}`
  }
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export const formatPkr = (amountPkr: number | null | undefined, compact = false): string => {
  if (amountPkr == null || !Number.isFinite(amountPkr)) return '₨ 0'
  if (compact && Math.abs(amountPkr) >= 10_000_000) {
    return `₨ ${(amountPkr / 10_000_000).toFixed(2)} Cr`
  }
  if (compact && Math.abs(amountPkr) >= 100_000) {
    return `₨ ${(amountPkr / 100_000).toFixed(2)} Lac`
  }
  if (compact && Math.abs(amountPkr) >= 1_000) {
    return `₨ ${(amountPkr / 1_000).toFixed(1)}k`
  }
  return `₨ ${Math.round(amountPkr).toLocaleString('en-PK')}`
}

export const formatCurrency = (
  amountUsd: number | null | undefined,
  currency: CurrencyMode = 'USD',
  pkrRate = DEFAULT_PKR_RATE,
  compact = false,
): string => {
  if (amountUsd == null || !Number.isFinite(amountUsd)) return currency === 'PKR' ? '₨ 0' : '$0.00'
  if (currency === 'PKR') {
    return formatPkr(usdToPkr(amountUsd, pkrRate), compact)
  }
  return formatUsd(amountUsd, compact)
}

export const getPriceDecimals = (price: number | null | undefined): number => {
  if (price == null || !Number.isFinite(price) || price === 0) return 2
  const abs = Math.abs(price)
  if (abs >= 1) return 2
  if (abs >= 0.01) return 4
  if (abs >= 0.0001) return 6
  return 8
}

export const formatPrice = (
  val: number | null | undefined,
  decimals?: number,
  currency: CurrencyMode = 'USD',
  pkrRate = DEFAULT_PKR_RATE,
): string => {
  if (val == null || isNaN(val)) return '—'
  if (currency === 'PKR') {
    const pkrVal = usdToPkr(val, pkrRate)
    if (pkrVal >= 1000) {
      return `₨ ${Math.round(pkrVal).toLocaleString('en-PK')}`
    }
    return `₨ ${pkrVal.toFixed(2)}`
  }
  const d = decimals !== undefined ? decimals : getPriceDecimals(val)
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
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
