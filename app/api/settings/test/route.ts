import { NextResponse } from 'next/server'
import { isEmailConfigured, sendTestEmail } from '@/lib/notify/resend'
import { isTelegramConfigured, sendTelegramText } from '@/lib/notify/telegram'
import { isBinanceSquareConfigured, sendTestSquarePost } from '@/lib/notify/binance-square'

export const dynamic = 'force-dynamic'

/**
 * Send a test message through one channel so the credentials and the chat /
 * inbox / feed can be verified from the settings page.
 *
 * Body: `{ channel: 'email' | 'telegram' | 'square' }`
 */
export async function POST(request: Request) {
  let channel: string | undefined
  try {
    channel = ((await request.json()) as { channel?: string }).channel
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    if (channel === 'email') {
      if (!isEmailConfigured()) {
        return NextResponse.json(
          { error: 'Email is not configured (API key and recipient required)' },
          { status: 400 },
        )
      }
      await sendTestEmail()
      return NextResponse.json({ ok: true, message: 'Test email sent' })
    }

    if (channel === 'telegram') {
      if (!isTelegramConfigured()) {
        return NextResponse.json(
          { error: 'Telegram is not configured (bot token and chat id required)' },
          { status: 400 },
        )
      }
      await sendTelegramText('✅ ETH Signal — test message. Telegram alerts are working.')
      return NextResponse.json({ ok: true, message: 'Test message sent' })
    }

    if (channel === 'square') {
      if (!isBinanceSquareConfigured()) {
        return NextResponse.json(
          { error: 'Binance Square is not configured (Creator OpenAPI key required)' },
          { status: 400 },
        )
      }
      const res = await sendTestSquarePost()
      return NextResponse.json({
        ok: true,
        message: `Test post published to Binance Square (Content ID: ${res.contentId ?? 'OK'})`,
      })
    }

    return NextResponse.json({ error: 'Unknown channel' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 },
    )
  }
}
