import { DirectionBadge } from '@/components/DirectionBadge'
import { formatPrice, formatScore, formatTime } from '@/lib/format'
import type { Signal } from '@/lib/types'

export type StoredSignal = Signal & { id: number; emailed: boolean }

export function SignalHistory({ signals }: { signals: StoredSignal[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Signal history
      </h2>

      {signals.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No signals stored yet. Run an analysis to create the first one.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Direction</th>
                <th className="py-2 pr-4 text-right font-medium">Score</th>
                <th className="py-2 pr-4 text-right font-medium">Price</th>
                <th className="py-2 pr-4 text-right font-medium">Chainlink</th>
                <th className="py-2 text-right font-medium">Emailed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {signals.map((signal) => (
                <tr key={signal.id} className="text-slate-300">
                  <td className="py-2 pr-4 whitespace-nowrap text-slate-400">
                    {formatTime(signal.timestamp)}
                  </td>
                  <td className="py-2 pr-4">
                    <DirectionBadge direction={signal.direction} size="sm" />
                  </td>
                  <td className="py-2 pr-4 text-right font-medium">{formatScore(signal.score)}</td>
                  <td className="py-2 pr-4 text-right">{formatPrice(signal.price)}</td>
                  <td className="py-2 pr-4 text-right text-slate-400">
                    {formatPrice(signal.chainlinkPrice)}
                  </td>
                  <td className="py-2 text-right text-slate-400">{signal.emailed ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
