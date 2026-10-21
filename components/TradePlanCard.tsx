import { formatPrice } from '@/lib/format'
import type { TradePlan } from '@/lib/types'

const ACTION_STYLES: Record<
  TradePlan['action'],
  { label: string; text: string; bg: string; border: string; solid: string }
> = {
  BUY: {
    label: 'BUY',
    text: 'text-up',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    solid: 'bg-emerald-500',
  },
  HOLD: {
    label: 'HOLD',
    text: 'text-info',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/40',
    solid: 'bg-sky-500',
  },
  SELL: {
    label: 'SELL',
    text: 'text-down',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    solid: 'bg-rose-500',
  },
  STAY_OUT: {
    label: 'STAY OUT',
    text: 'text-muted',
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
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-xs uppercase tracking-wide text-subtle">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-subtle">{hint}</p> : null}
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
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Trade plan</p>
            <p className="mt-1 max-w-xl text-sm font-medium text-ink">{plan.headline}</p>
          </div>
        </div>

        {plan.gate === 'blocked-by-trend' ? (
          <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-warn">
            Trend gate closed
          </span>
        ) : plan.gate === 'scalp-open' ? (
          <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-up flex items-center gap-1.5">
            <span>⚡</span>
            <span>Reversal Scalp Active</span>
          </span>
        ) : null}
      </div>

      {plan.levels ? (
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
              hint={`+${plan.levels.targetDistancePct}% · primary target`}
              tone="up"
            />
            <Level
              label="Reward : risk"
              value={`${plan.levels.riskReward} : 1`}
              hint={`risk ${plan.levels.stopDistancePct}% to make ${plan.levels.targetDistancePct}%`}
            />
          </div>

          {/* Staged Take-Profit Scale-Outs & Breakeven Stop Ratchet */}
          {plan.levels.stagedTargets && plan.levels.stagedTargets.length > 0 && (
            <div className="rounded-xl border border-line-soft bg-surface-2 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted">
                  Staged Scale-Outs & Stop Ratchet
                </span>
                {plan.levels.breakevenPrice && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    🛡️ Ratchet to Breakeven at ${plan.levels.breakevenPrice}
                  </span>
                )}
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {plan.levels.stagedTargets.map((t) => (
                  <div
                    key={t.tier}
                    className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-medium text-ink">
                        T{t.tier}: {t.sizePct}% size
                      </span>
                      <p className="text-[10px] text-subtle">
                        {t.action === 'breakeven-stop'
                          ? 'Moves Stop to Breakeven'
                          : t.action === 'trail-stop'
                          ? 'Trails with SuperTrend'
                          : 'Trailing runner exit'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-up">${t.price}</span>
                      <p className="text-[10px] text-muted">+{t.distancePct}% ({t.riskReward}R)</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : plan.protectiveStop != null ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="w-full sm:w-auto sm:min-w-[200px]">
            <Level
              label="Protective stop"
              value={formatPrice(plan.protectiveStop)}
              hint="if you already hold"
              tone="down"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">If you are flat</p>
          <p className="mt-1 text-sm text-muted">{plan.forFlat}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">If you already hold</p>
          <p className="mt-1 text-sm text-muted">{plan.forHolder}</p>
        </div>
      </div>

      {plan.rationale.length > 0 ? (
        <div className="mt-5 border-t border-line-soft pt-4">
          <p className="text-xs uppercase tracking-wide text-subtle">Why</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
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
