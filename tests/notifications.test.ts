import { describe, expect, it } from 'vitest'
import {
  clearAllNotifications,
  getRecentNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  recordAppNotification,
} from '@/lib/db/client'
import { notifyImportantEvent } from '@/lib/notify/events'

describe('Notification System & Event Dispatcher', () => {
  it('records an application notification and updates unread count', () => {
    clearAllNotifications()
    expect(getUnreadNotificationsCount()).toBe(0)

    const id = recordAppNotification({
      type: 'trade',
      level: 'success',
      title: 'Order Placed',
      message: 'BUY 0.05 ETH @ $2,450.00',
      symbol: 'ETH/USDT',
      data: null,
      read: 0,
    })

    expect(id).toBeGreaterThan(0)
    expect(getUnreadNotificationsCount()).toBe(1)

    const recent = getRecentNotifications(5)
    expect(recent.length).toBeGreaterThan(0)
    expect(recent[0].title).toBe('Order Placed')
    expect(recent[0].level).toBe('success')
    expect(recent[0].symbol).toBe('ETH/USDT')
    expect(recent[0].read).toBe(0)
  })

  it('marks notifications as read', () => {
    clearAllNotifications()
    const id = recordAppNotification({
      type: 'signal',
      level: 'info',
      title: 'Signal Flip',
      message: 'SOL/USDT flipped to BUY',
      symbol: 'SOL/USDT',
      data: null,
      read: 0,
    })

    expect(getUnreadNotificationsCount()).toBe(1)
    markNotificationRead(id)
    expect(getUnreadNotificationsCount()).toBe(0)
  })

  it('marks all notifications as read and clears notifications', () => {
    clearAllNotifications()
    recordAppNotification({
      type: 'risk',
      level: 'warning',
      title: 'Guard Tripped',
      message: 'Daily loss limit reached',
      symbol: null,
      data: null,
      read: 0,
    })
    recordAppNotification({
      type: 'hot-coin',
      level: 'success',
      title: 'Hot Coin Buy',
      message: 'Auto-bought PEPE',
      symbol: 'PEPE/USDT',
      data: null,
      read: 0,
    })

    expect(getUnreadNotificationsCount()).toBe(2)
    markAllNotificationsRead()
    expect(getUnreadNotificationsCount()).toBe(0)

    clearAllNotifications()
    expect(getRecentNotifications().length).toBe(0)
  })

  it('dispatches important events safely through notifyImportantEvent', async () => {
    clearAllNotifications()

    const event = await notifyImportantEvent({
      type: 'trade',
      level: 'success',
      title: 'Simulated BUY Order',
      message: 'Simulated BUY 1.5 SOL @ $165.20',
      symbol: 'SOL/USDT',
      data: { price: 165.2, qty: 1.5 },
    })

    expect(event).toBeDefined()
    expect(event.title).toBe('Simulated BUY Order')
    expect(event.level).toBe('success')
    expect(event.type).toBe('trade')
    expect(event.read).toBe(0)
    expect(getUnreadNotificationsCount()).toBe(1)
  })
})
