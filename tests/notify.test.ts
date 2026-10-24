import { describe, expect, it } from 'vitest'
import { publicNotifySettings, type NotifySettings } from '@/lib/notify/settings'
import { shouldNotify } from '@/lib/signal/plan'

const buy = { action: 'BUY', direction: 'LONG' } as const
const stayOut = { action: 'STAY_OUT', direction: 'NEUTRAL' } as const
const stayOutLong = { action: 'STAY_OUT', direction: 'LONG' } as const

describe('shouldNotify — every', () => {
  it('always alerts, even when nothing changed', () => {
    expect(shouldNotify('every', buy, buy)).toBe(true)
    expect(shouldNotify('every', stayOut, stayOut)).toBe(true)
  })

  it('alerts with no previous signal', () => {
    expect(shouldNotify('every', null, stayOut)).toBe(true)
  })
})

describe('shouldNotify — action-change', () => {
  it('alerts when the plan action changes', () => {
    expect(shouldNotify('action-change', buy, stayOut)).toBe(true)
    expect(shouldNotify('action-change', stayOut, buy)).toBe(true)
  })

  it('stays quiet when the action repeats', () => {
    expect(shouldNotify('action-change', buy, buy)).toBe(false)
  })

  it('stays quiet on a pure direction flip with the same action', () => {
    const long = { action: 'HOLD', direction: 'LONG' } as const
    const short = { action: 'HOLD', direction: 'SHORT' } as const
    expect(shouldNotify('action-change', long, short)).toBe(false)
  })

  it('stays quiet on a fresh neutral plan', () => {
    expect(shouldNotify('action-change', null, stayOut)).toBe(false)
  })

  it('alerts on a fresh actionable plan', () => {
    expect(shouldNotify('action-change', null, buy)).toBe(true)
  })
})

describe('shouldNotify — direction-change', () => {
  it('alerts when the direction flips', () => {
    expect(shouldNotify('direction-change', stayOutLong, { action: 'STAY_OUT', direction: 'SHORT' })).toBe(
      true,
    )
  })

  it('alerts on an action change even when direction repeats', () => {
    expect(shouldNotify('direction-change', buy, { action: 'HOLD', direction: 'LONG' })).toBe(false)
  })

  it('stays quiet on a fresh neutral reading', () => {
    expect(shouldNotify('direction-change', null, stayOut)).toBe(false)
  })

  it('alerts on a fresh directional reading', () => {
    expect(shouldNotify('direction-change', null, { action: 'STAY_OUT', direction: 'SHORT' })).toBe(
      true,
    )
  })
})

describe('publicNotifySettings', () => {
  it('never exposes secrets, only set/unset flags', () => {
    const settings: NotifySettings = {
      email: {
        enabled: true,
        mode: 'action-change',
        apiKey: 're_super_secret',
        from: 'a@b.co',
        to: 'x@y.co',
      },
      telegram: { enabled: true, mode: 'every', botToken: '123:ABC-secret', chatId: '42' },
      square: { enabled: true, mode: 'action-change', apiKey: 'sq_super_secret' },
    }

    const publicView = publicNotifySettings(settings)
    const serialized = JSON.stringify(publicView)

    expect(serialized).not.toContain('re_super_secret')
    expect(serialized).not.toContain('123:ABC-secret')
    expect(serialized).not.toContain('sq_super_secret')
    expect(publicView.email.apiKeySet).toBe(true)
    expect(publicView.telegram.botTokenSet).toBe(true)
    expect(publicView.square.apiKeySet).toBe(true)
    expect(publicView.telegram.mode).toBe('every')
    expect(publicView.telegram.chatId).toBe('42')
  })

  it('reports unset secrets as false', () => {
    const settings: NotifySettings = {
      email: { enabled: false, mode: 'action-change', apiKey: '', from: 'a@b.co', to: '' },
      telegram: { enabled: false, mode: 'action-change', botToken: '', chatId: '' },
      square: { enabled: false, mode: 'action-change', apiKey: '' },
    }

    const publicView = publicNotifySettings(settings)
    expect(publicView.email.apiKeySet).toBe(false)
    expect(publicView.telegram.botTokenSet).toBe(false)
    expect(publicView.square.apiKeySet).toBe(false)
  })
})
