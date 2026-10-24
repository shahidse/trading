import { NextResponse } from 'next/server'
import {
  clearAllNotifications,
  getRecentNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/db/client'
import { notifyImportantEvent } from '@/lib/notify/events'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const notifications = getRecentNotifications(40)
    const unreadCount = getUnreadNotificationsCount()

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load notifications' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: 'mark_read' | 'mark_all_read' | 'clear_all' | 'test'
      id?: number
    }

    if (body.action === 'mark_read' && typeof body.id === 'number') {
      markNotificationRead(body.id)
      return NextResponse.json({ success: true, unreadCount: getUnreadNotificationsCount() })
    }

    if (body.action === 'mark_all_read') {
      markAllNotificationsRead()
      return NextResponse.json({ success: true, unreadCount: 0 })
    }

    if (body.action === 'clear_all') {
      clearAllNotifications()
      return NextResponse.json({ success: true, unreadCount: 0 })
    }

    if (body.action === 'test') {
      const created = await notifyImportantEvent({
        type: 'trade',
        level: 'success',
        title: 'Test Notification: Order Placed',
        message: '🟢 Simulated BUY order for 0.05 ETH @ $2,420.50 (OCO TP: $2,580, SL: $2,340)',
        symbol: 'ETH/USDT',
        data: { test: true },
      })
      return NextResponse.json({ success: true, notification: created })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 },
    )
  }
}
