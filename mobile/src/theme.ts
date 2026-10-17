/**
 * Design system colors and themes for dark trading terminal UI
 */

export const colors = {
  bg: '#090d16',
  surface: '#111726',
  surface2: '#182238',
  surface3: '#222f4c',
  border: '#23304a',
  borderSubtle: '#19243a',
  
  // Brand / Accents
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primaryLight: 'rgba(99, 102, 241, 0.15)',
  
  // Market signals
  bullish: '#10b981',
  bullishBg: 'rgba(16, 185, 129, 0.12)',
  bullishBorder: 'rgba(16, 185, 129, 0.25)',
  
  bearish: '#f43f5e',
  bearishBg: 'rgba(244, 63, 94, 0.12)',
  bearishBorder: 'rgba(244, 63, 94, 0.25)',
  
  neutral: '#94a3b8',
  neutralBg: 'rgba(148, 163, 184, 0.12)',
  neutralBorder: 'rgba(148, 163, 184, 0.25)',
  
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.25)',

  // Text
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  textDisabled: '#475569',
  
  // Levels
  entry: '#38bdf8',
  stopLoss: '#f43f5e',
  takeProfit: '#10b981',
}

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
