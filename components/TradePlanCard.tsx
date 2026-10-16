import { formatPrice } from '@/lib/format'
import type { TradePlan } from '@/lib/types'

const ACTION_STYLES: Record<
  TradePlan['action'],
  { label: string; text: string; bg: string; border: string; solid: string }
> = {
  BUY: {
    label: 'BUY',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    solid: 'bg-emerald-500',
  },
  HOLD: {
    label: 'HOLD',
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/40',
    solid: 'bg-sky-500',
  },
  SELL: {
    label: 'SELL',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    solid: 'bg-rose-500',
  },
  STAY_OUT: {
    label: 'STAY OUT',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/40',
    solid: 'bg-slate-500',
  },
}

function Level({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'up' | 'down' | 'default'
}) {
  const color =
    tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : 'text-slate-100'
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

/** The "what do I actually do" card: entry, stop-loss, take-profit. */
export function TradePlanCard({ plan }: { plan: TradePlan }) {
  const styles = ACTION_STYLES[plan.action]

  return (
    <section className={`rounded-2xl border ${styles.border} ${styles.bg} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className={`rounded-lg border px-4 py-2 text-xl font-bold tracking-wide ${styles.text} ${styles.border}`}
          >
            {styles.label}
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Trade plan</p>
            <p className="mt-1 max-w-xl text-sm font-medium text-slate-100">{plan.headline}</p>
          </div>
        </div>

        {plan.gate === 'blocked-by-trend' ? (
          <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
            Trend gate closed
          </span>
        ) : null}
      </div>

      {plan.levels ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Level label="Entry" value={formatPrice(plan.levels.entry)} hint="buy here" />
          <Level
            label="Stop loss"
            value={formatPrice(plan.levels.stopLoss)}
            hint={`−${plan.levels.stopDistancePct}% · sell if breached`}
            tone="down"
          />
          <Level
            label="Take profit"
            value={formatPrice(plan.levels.takeProfit)}
            hint={`+${plan.levels.targetDistancePct}% · sell here`}
            tone="up"
          />
          <Level
            label="Reward : risk"
            value={`${plan.levels.riskReward} : 1`}
            hint={`risk ${plan.levels.stopDistancePct}% to make ${plan.levels.targetDistancePct}%`}
          />
        </div>
      ) : plan.protectiveStop != null ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Level
            label="Protective stop"
            value={formatPrice(plan.protectiveStop)}
            hint="if you already hold"
            tone="down"
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 border-t border-white/5 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">If you are flat</p>
          <p className="mt-1 text-sm text-slate-300">{plan.forFlat}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">If you already hold</p>
          <p className="mt-1 text-sm text-slate-300">{plan.forHolder}</p>
        </div>
      </div>

      {plan.rationale.length > 0 ? (
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Why</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {plan.rationale.map((reason, index) => (
              <li key={index} className="flex gap-2">
                <span className={styles.text}>›</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
