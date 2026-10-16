import type { IndicatorScore } from '@/lib/types'

function Bar({ value }: { value: number }) {
  // value is -100..100 → 0..100% width, centred at 0.
  const width = Math.min(100, Math.max(0, (value + 100) / 2))
  const positive = value >= 0

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
      <div className="absolute left-1/2 top-0 h-full w-px bg-slate-500/60" />
      <div
        className={`absolute top-0 h-full ${positive ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}
        style={{
          width: `${Math.abs(value) / 2}%`,
          left: positive ? '50%' : `${50 - Math.abs(value) / 2}%`,
        }}
      />
    </div>
  )
}

const GROUP_LABEL: Record<IndicatorScore['group'], string> = {
  trend: 'trend',
  'mean-reversion': 'mean-rev',
  neutral: 'context',
}

/** Weight after the ADX tilt, with the direction of the tilt. */
function weightLabel(indicator: IndicatorScore): string {
  const before = indicator.baseWeight * 100
  const after = indicator.weight * 100
  const arrow = after > before + 0.5 ? '↑' : after < before - 0.5 ? '↓' : ''
  return `${after.toFixed(0)}%${arrow ? ` ${arrow}` : ''}`
}

export function IndicatorPanel({ indicators }: { indicators: IndicatorScore[] }) {
  if (indicators.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
        Not enough candle data to compute indicators yet.
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Indicator breakdown
      </h2>

      <div className="mt-4 space-y-5">
        {indicators.map((indicator) => (
          <div key={indicator.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-200">
                {indicator.label}
                <span className="ml-2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  {GROUP_LABEL[indicator.group]}
                </span>
              </span>
              <span className="text-xs text-slate-500">{weightLabel(indicator)}</span>
              <span
                className={`w-24 text-right text-sm font-semibold ${
                  indicator.raw >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {indicator.raw > 0 ? '+' : ''}
                {indicator.raw}
              </span>
            </div>

            <div className="mt-2">
              <Bar value={indicator.raw} />
            </div>

            <div className="mt-2 flex items-start justify-between gap-4 text-xs">
              <span className="text-slate-400">{indicator.detail}</span>
              <span className="whitespace-nowrap text-slate-500">
                contributes {indicator.contribution > 0 ? '+' : ''}
                {indicator.contribution}
              </span>
            </div>

            {indicator.key === 'pattern' && Array.isArray(indicator.meta?.detected) ? (
              <p className="mt-1 text-xs text-slate-500">
                detected: {(indicator.meta?.detected as string[]).join(', ') || 'none'}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
