'use client'

import { useState } from 'react'
import { DirectionBadge } from '@/components/DirectionBadge'
import { directionStyles, formatAge, formatPrice, formatScore, formatTime } from '@/lib/format'
import { captureCandleChartSnapshot } from '@/lib/chart-capture'
import { SquarePostModal } from '@/components/SquarePostModal'
import type { Signal } from '@/lib/types'

export function SignalCard({ signal }: { signal: Signal & { emailed?: boolean } }) {
  const styles = directionStyles[signal.direction]
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [chartSnapshot, setChartSnapshot] = useState<string | undefined>(undefined)
  const [postResult, setPostResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleOpenSquareModal = () => {
    try {
      const imageBase64 = captureCandleChartSnapshot(signal.symbol, signal.timeframe)
      setChartSnapshot(imageBase64 || undefined)
    } catch {
      setChartSnapshot(undefined)
    }
    setIsModalOpen(true)
  }

  return (
    <section className={`rounded-2xl border ${styles.border} ${styles.bg} p-4 sm:p-6`}>
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
          {signal.macroTrend && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  signal.macroTrend.verdict === 'bullish'
                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : signal.macroTrend.verdict === 'bearish'
                    ? 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
                    : 'border border-line bg-surface-2 text-muted'
                }`}
              >
                1h Macro: {signal.macroTrend.verdict}
              </span>
              <span className="text-xs text-subtle">
                {signal.macroTrend.alignmentWithSignal === 'aligned'
                  ? '🎯 Full Macro Trend Alignment'
                  : signal.macroTrend.alignmentWithSignal === 'counter-trend'
                  ? '⚠️ Counter-Macro Trend Scalp'
                  : 'Macro Neutral'} · {signal.macroTrend.detail}
              </span>
            </div>
          )}
        </div>

        <div className="text-left sm:text-right text-sm w-full sm:w-auto">
          <p className="text-muted">Spot action</p>
          <p className={`font-medium ${styles.text}`}>{styles.spotAction}</p>
          <p className="mt-2 text-xs text-subtle">
            {formatTime(signal.timestamp)} · {formatAge(signal.timestamp)}
          </p>
          <div className="mt-2.5 flex flex-col items-start sm:items-end gap-1.5">
            <button
              type="button"
              onClick={handleOpenSquareModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-500/20 active:scale-95 dark:text-amber-400"
              title="Choose template and publish this trade signal to Binance Square"
            >
              <span>📢</span>
              <span>Share on Square</span>
            </button>
            {postResult && (
              <span
                className={`text-[11px] font-medium max-w-[200px] truncate ${
                  postResult.ok ? 'text-emerald-500' : 'text-rose-400'
                }`}
                title={postResult.message}
              >
                {postResult.ok ? '✅ ' : '⚠️ '}
                {postResult.message}
              </span>
            )}
          </div>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-subtle truncate">Binance</dt>
          <dd className="mt-1 text-base xl:text-lg font-semibold truncate">{formatPrice(signal.price)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-subtle truncate">Chainlink</dt>
          <dd className="mt-1 text-base xl:text-lg font-semibold truncate">{formatPrice(signal.chainlinkPrice)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-subtle truncate">Divergence</dt>
          <dd className="mt-1 text-base xl:text-lg font-semibold truncate">
            {signal.divergencePct != null ? `${signal.divergencePct}%` : '—'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-subtle truncate">Emailed</dt>
          <dd className="mt-1 text-base xl:text-lg font-semibold truncate">{signal.emailed ? 'Yes' : 'No'}</dd>
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

      {/* Binance Square Posting Modal with Template Selector */}
      <SquarePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="signal"
        signal={signal}
        initialImageBase64={chartSnapshot}
        onPublished={(res) => {
          setPostResult({
            ok: res.ok,
            message: res.contentId ? `Posted! (ID: ${res.contentId})` : res.message,
          })
        }}
      />
    </section>
  )
}
