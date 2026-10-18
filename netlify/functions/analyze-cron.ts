/**
 * Netlify Scheduled Function (Runs automatically every 15 minutes in the cloud)
 *
 * Calls the Next.js /api/analyze route to:
 * 1. Fetch live 15m Binance klines & Chainlink oracle price
 * 2. Run multi-indicator confluence + ADX regime filter + ATR thresholds
 * 3. Evaluate Reversal Scalping Mode (bounces from oversold / bullish candle patterns)
 * 4. Execute automated dry-run or live spot trading orders & OCO brackets
 * 5. Send Telegram / Email notifications
 */
export default async () => {
  const siteUrl = process.env.URL || 'https://jade-pavlova-ba20a5.netlify.app'
  const endpoint = `${siteUrl.replace(/\/+$/, '')}/api/analyze`

  console.log(`[Netlify Cron] Triggering 15-minute analysis at ${endpoint}...`)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'User-Agent': 'Netlify-Scheduled-Cron/1.0',
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[Netlify Cron] Analysis returned status ${res.status}:`, errorText)
      return new Response(JSON.stringify({ error: errorText, status: res.status }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const json = (await res.json()) as {
      signal?: { direction?: string; score?: number; plan?: { action?: string } }
      trade?: { status?: string; side?: string; price?: number }
    }

    console.log(`[Netlify Cron] Analysis succeeded:`, {
      direction: json.signal?.direction,
      action: json.signal?.plan?.action,
      score: json.signal?.score,
      trade: json.trade?.status ?? 'none',
    })

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: Date.now(),
        direction: json.signal?.direction,
        action: json.signal?.plan?.action,
        trade: json.trade?.status ?? null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Netlify Cron] Exception during execution:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = {
  schedule: '*/15 * * * *',
}
