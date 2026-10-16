import { DirectionBadge } from '@/components/DirectionBadge'
import { directionStyles, formatAge, formatPrice, formatScore, formatTime } from '@/lib/format'
import type { Signal } from '@/lib/types'

export function SignalCard({ signal }: { signal: Signal & { emailed?: boolean } }) {
  const styles = directionStyles[signal.direction]

  return (
    <section className={`rounded-2xl border ${styles.border} ${styles.bg} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {signal.symbol} · {signal.timeframe} · latest signal
          </p>
          <div className="mt-3 flex items-center gap-4">
            <DirectionBadge direction={signal.direction} size="lg" />
            <div>
              <p className="text-sm text-slate-400">Composite score</p>
              <p className={`text-2xl font-semibold ${styles.text}`}>
                {formatScore(signal.score)}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  confidence {signal.confidence}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="text-right text-sm">
          <p className="text-slate-400">Spot action</p>
          <p className={`font-medium ${styles.text}`}>{styles.spotAction}</p>
          <p className="mt-2 text-xs text-slate-500">
            {formatTime(signal.timestamp)} · {formatAge(signal.timestamp)}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Binance</dt>
          <dd className="mt-1 text-lg font-semibold">{formatPrice(signal.price)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Chainlink</dt>
          <dd className="mt-1 text-lg font-semibold">{formatPrice(signal.chainlinkPrice)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Divergence</dt>
          <dd className="mt-1 text-lg font-semibold">
            {signal.divergencePct != null ? `${signal.divergencePct}%` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Emailed</dt>
          <dd className="mt-1 text-lg font-semibold">{signal.emailed ? 'Yes' : 'No'}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-4 border-t border-white/5 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Market regime</p>
          <p className="mt-1 text-sm text-slate-300">{signal.regime.detail}</p>
          <p className="mt-1 text-xs text-slate-500">
            ADX {signal.regime.adx ?? '—'} · threshold ×{signal.regime.thresholdMultiplier} →
            {' ±'}
            {signal.thresholdsUsed.long}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Confluence</p>
          <p className="mt-1 text-sm text-slate-300">{signal.confluence.detail}</p>
          <p className="mt-1 text-xs text-slate-500">
            {signal.confluence.bullish} bullish · {signal.confluence.bearish} bearish ·{' '}
            {signal.confluence.verdict}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-white/5 pt-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Why</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
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
