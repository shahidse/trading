import { directionStyles } from '@/lib/format'
import type { SignalDirection } from '@/lib/types'

export function DirectionBadge({
  direction,
  size = 'md',
}: {
  direction: SignalDirection
  size?: 'sm' | 'md' | 'lg'
}) {
  const styles = directionStyles[direction]
  const sizing =
    size === 'lg'
      ? 'text-3xl px-5 py-2'
      : size === 'sm'
        ? 'text-xs px-2 py-0.5'
        : 'text-lg px-3 py-1'

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-semibold tracking-wide ${styles.text} ${styles.bg} ${styles.border} ${sizing}`}
    >
      {styles.label}
    </span>
  )
}
