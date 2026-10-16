/** Display helpers safe for both server and client components. */

export function formatPrice(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function formatScore(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatAge(from: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - from) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export const directionStyles = {
  LONG: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    solid: 'bg-emerald-500',
    label: 'LONG',
    spotAction: 'Buy / hold spot',
  },
  SHORT: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    solid: 'bg-rose-500',
    label: 'SHORT',
    spotAction: 'Exit / avoid long (spot cannot short)',
  },
  NEUTRAL: {
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/40',
    solid: 'bg-slate-500',
    label: 'NEUTRAL',
    spotAction: 'No action — stay flat',
  },
} as const
