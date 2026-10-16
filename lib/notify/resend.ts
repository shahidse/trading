import { Resend } from 'resend'
import { config } from '@/lib/config'
import type { Signal } from '@/lib/types'

export function isEmailConfigured(): boolean {
  return Boolean(config.email.apiKey && config.email.to)
}

function accentColor(direction: Signal['direction']): string {
  if (direction === 'LONG') return '#16a34a'
  if (direction === 'SHORT') return '#dc2626'
  return '#6b7280'
}

function renderHtml(signal: Signal): string {
  const accent = accentColor(signal.direction)

  const rows = signal.indicators
    .map(
      (i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${i.label}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:${i.raw >= 0 ? '#16a34a' : '#dc2626'};">
          ${i.raw > 0 ? '+' : ''}${i.raw}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">
          ${i.contribution > 0 ? '+' : ''}${i.contribution}
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;font-size:13px;">${i.detail}</td>
      </tr>`,
    )
    .join('')

  const reasons = signal.reasons.map((r) => `<li>${r}</li>`).join('')

  const levels = signal.plan.levels
  const levelsHtml = levels
    ? `<table style="width:100%;font-size:13px;margin-top:10px;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;color:#666;">Entry</td>
          <td style="text-align:right;font-weight:600;">$${levels.entry.toLocaleString()}</td>
          <td style="padding:4px 0 4px 16px;color:#666;">Stop loss</td>
          <td style="text-align:right;font-weight:600;color:#dc2626;">$${levels.stopLoss.toLocaleString()} (−${levels.stopDistancePct}%)</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#666;">Take profit</td>
          <td style="text-align:right;font-weight:600;color:#16a34a;">$${levels.takeProfit.toLocaleString()} (+${levels.targetDistancePct}%)</td>
          <td style="padding:4px 0 4px 16px;color:#666;">Reward:risk</td>
          <td style="text-align:right;font-weight:600;">${levels.riskReward} : 1</td>
        </tr>
      </table>`
    : signal.plan.protectiveStop != null
      ? `<div style="font-size:13px;margin-top:8px;color:#666;">Protective stop for an existing position: $${signal.plan.protectiveStop.toLocaleString()}</div>`
      : ''

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:${accent};color:#fff;padding:20px 24px;">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">
            ${signal.symbol} · ${signal.timeframe}
          </div>
          <div style="font-size:28px;font-weight:700;margin-top:4px;">
            ${signal.plan.action}${
              signal.plan.action === 'STAY_OUT' || signal.plan.action === 'HOLD'
                ? ` <span style="font-size:14px;font-weight:400;opacity:.85;">(signal: ${signal.direction})</span>`
                : ''
            }
          </div>
          <div style="margin-top:6px;opacity:.95;">
            Composite score ${signal.score > 0 ? '+' : ''}${signal.score} · confidence ${signal.confidence}
          </div>
        </div>

        <div style="padding:20px 24px;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;color:#666;">Exchange price (Binance)</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;">$${signal.price.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Chainlink ETH/USD</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;">
                ${signal.chainlinkPrice != null ? `$${signal.chainlinkPrice.toLocaleString()}` : '—'}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Oracle divergence</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;">
                ${signal.divergencePct != null ? `${signal.divergencePct}%` : '—'}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Generated at</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;">
                ${new Date(signal.timestamp).toUTCString()}
              </td>
            </tr>
          </table>

          <h3 style="font-size:15px;margin:24px 0 8px;">Trade plan</h3>
          <div style="border-left:4px solid ${accent};padding:12px 14px;background:#f9fafb;border-radius:6px;">
            <div style="font-size:13px;font-weight:700;letter-spacing:.05em;color:${accent};">${signal.plan.action}</div>
            <div style="font-size:14px;margin-top:4px;">${signal.plan.headline}</div>
            ${levelsHtml}
            <div style="font-size:13px;color:#444;margin-top:10px;"><strong>If flat:</strong> ${signal.plan.forFlat}</div>
            <div style="font-size:13px;color:#444;margin-top:4px;"><strong>If holding:</strong> ${signal.plan.forHolder}</div>
          </div>

          <h3 style="font-size:15px;margin:24px 0 8px;">Indicator breakdown</h3>
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <thead>
              <tr style="color:#888;font-size:12px;text-transform:uppercase;">
                <th style="text-align:left;padding:6px 8px;">Indicator</th>
                <th style="text-align:right;padding:6px 8px;">Raw</th>
                <th style="text-align:right;padding:6px 8px;">Weighted</th>
                <th style="text-align:left;padding:6px 8px;">Reading</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <h3 style="font-size:15px;margin:24px 0 8px;">Context</h3>
          <p style="font-size:13px;color:#444;margin:0 0 6px;">${signal.regime.detail}</p>
          <p style="font-size:13px;color:#444;margin:0 0 6px;">${signal.confluence.detail}</p>
          <p style="font-size:13px;color:#666;margin:0;">
            Decision thresholds this run: ${signal.thresholdsUsed.long} / ${signal.thresholdsUsed.short}
          </p>

          <h3 style="font-size:15px;margin:24px 0 8px;">Why</h3>
          <ul style="font-size:14px;color:#333;padding-left:20px;margin:0;">${reasons}</ul>

          <p style="font-size:12px;color:#999;margin-top:24px;">
            Spot market note: a SHORT signal on spot means “exit / avoid long”, not a short sale.
            This is an automated technical analysis alert, not financial advice.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`
}

/**
 * Send the alert email for a signal. Returns false when email is not
 * configured, so local runs stay silent until you add Resend credentials.
 */
export async function sendSignalEmail(signal: Signal): Promise<boolean> {
  if (!isEmailConfigured()) return false

  const resend = new Resend(config.email.apiKey)
  const subject = `[${signal.symbol} ${signal.timeframe}] ${signal.plan.action} · score ${
    signal.score > 0 ? '+' : ''
  }${signal.score} · $${signal.price.toLocaleString()}`

  const { error } = await resend.emails.send({
    from: config.email.from,
    to: config.email.to.split(',').map((s) => s.trim()).filter(Boolean),
    subject,
    html: renderHtml(signal),
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
  return true
}
