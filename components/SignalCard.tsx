import { DirectionBadge } from '@/components/DirectionBadge'
import { directionStyles, formatAge, formatPrice, formatScore, formatTime } from '@/lib/format'
import type { Signal } from '@/lib/types'

export function SignalCard({ signal }: { signal: Signal & { emailed?: boolean } }) {
  const styles = directionStyles[signal.direction]

  return (
    <section className={`rounded-2xl border ${styles.border} ${styles.bg} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {signal.symbol} · {signal.timeframe} · latest signal
          </p>
          <div className="mt-3 flex items-center gap-4">
            <DirectionBadge direction={signal.direction} size="lg" />
            <div>
              <p className="text-sm text-muted">Composite score</p>
              <p className={`text-2xl font-semibold ${styles.text}`}>
                {formatScore(signal.score)}
                <span className="ml-2 text-sm font-normal text-muted">
                  confidence {signal.confidence}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="text-right text-sm">
          <p className="text-muted">Spot action</p>
          <p className={`font-medium ${styles.text}`}>{styles.spotAction}</p>
          <p className="mt-2 text-xs text-subtle">
            {formatTime(signal.timestamp)} · {formatAge(signal.timestamp)}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-subtle">Binance</dt>
          <dd className="mt-1 text-lg font-semibold">{formatPrice(signal.price)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-subtle">Chainlink</dt>
          <dd className="mt-1 text-lg font-semibold">{formatPrice(signal.chainlinkPrice)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-subtle">Divergence</dt>
          <dd className="mt-1 text-lg font-semibold">
            {signal.divergencePct != null ? `${signal.divergencePct}%` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-subtle">Emailed</dt>
          <dd className="mt-1 text-lg font-semibold">{signal.emailed ? 'Yes' : 'No'}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">Market regime</p>
          <p className="mt-1 text-sm text-muted">{signal.regime.detail}</p>
          <p className="mt-1 text-xs text-subtle">
            ADX {signal.regime.adx ?? '—'} · threshold ×{signal.regime.thresholdMultiplier} →
            {' ±'}
            {signal.thresholdsUsed.long}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">Confluence</p>
          <p className="mt-1 text-sm text-muted">{signal.confluence.detail}</p>
          <p className="mt-1 text-xs text-subtle">
            {signal.confluence.bullish} bullish · {signal.confluence.bearish} bearish ·{' '}
            {signal.confluence.verdict}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-line-soft pt-4">
        <p className="text-xs uppercase tracking-wide text-subtle">Why</p>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {signal.reasons.map((reason, index) => (
            <li key={index} className="flex gap-2">
              <span className={styles.text}>›</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
