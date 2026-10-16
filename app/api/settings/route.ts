import { NextResponse } from 'next/server'
import {
  getNotifySettings,
  publicNotifySettings,
  saveNotifySettings,
  type NotifySettingsPatch,
} from '@/lib/notify/settings'

export const dynamic = 'force-dynamic'

/**
 * Notification settings (channel on/off, trigger mode, recipients, keys).
 *
 * GET returns the effective config with secrets reduced to set/unset flags —
 * stored keys are never echoed back to the browser.
 *
 * PUT applies a partial patch. Secret fields are only changed when explicitly
 * present in the body, so saving the form without retyping a key leaves it
 * untouched; sending `""` clears it.
 */
export async function GET() {
  try {
    return NextResponse.json({ settings: publicNotifySettings() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read settings' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as NotifySettingsPatch
    saveNotifySettings(body)
    return NextResponse.json({ settings: publicNotifySettings() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 },
    )
  }
}

/** Expose the resolved config for the CLI/scheduler parity check in the UI. */
export async function POST() {
  return NextResponse.json({ settings: publicNotifySettings(getNotifySettings()) })
}
