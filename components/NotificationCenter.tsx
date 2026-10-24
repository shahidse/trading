'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoredAppNotification } from '@/lib/db/client'
import { readJson } from '@/lib/utils'

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 30) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const TYPE_ICONS: Record<string, string> = {
  trade: '💼',
  'hot-coin': '🔥',
  risk: '🛡️',
  signal: '⚡',
  system: '⚙️',
}

const LEVEL_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  success: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
  },
  error: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
  },
  info: {
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
  },
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<StoredAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'all' | 'trade' | 'hot-coin' | 'risk' | 'signal'>('all')
  const [toast, setToast] = useState<StoredAppNotification | null>(null)
  const [hasWebNotification, setHasWebNotification] = useState(false)
  const [busy, setBusy] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const lastSeenIdRef = useRef<number>(0)

  // Check browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasWebNotification(Notification.permission === 'granted')
    }
  }, [])

  const fetchNotifications = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const json = await readJson<{
        notifications: StoredAppNotification[]
        unreadCount: number
      }>(res)

      setNotifications(json.notifications)
      setUnreadCount(json.unreadCount)

      // Detect newly arrived notifications for live toast popup
      if (json.notifications.length > 0) {
        const newest = json.notifications[0]
        if (!isInitial && newest.id > lastSeenIdRef.current && newest.read === 0) {
          setToast(newest)
          // Fire browser desktop notification if permission granted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`${newest.title}`, {
                body: newest.message,
                icon: '/favicon.ico',
              })
            } catch {}
          }
        }
        lastSeenIdRef.current = Math.max(lastSeenIdRef.current, newest.id)
      }
    } catch {
      // Degrade gracefully
    }
  }, [])

  // Poll for live notifications every 10 seconds
  useEffect(() => {
    void fetchNotifications(true)
    const interval = setInterval(() => void fetchNotifications(false), 10_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Auto-dismiss floating toast after 7s
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 7000)
    return () => clearInterval(timer)
  }, [toast])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function requestDesktopPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setHasWebNotification(perm === 'granted')
    }
  }

  async function handleMarkAllRead() {
    setBusy(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })))
      setUnreadCount(0)
    } finally {
      setBusy(false)
    }
  }

  async function handleClearAll() {
    setBusy(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_all' }),
      })
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setBusy(false)
    }
  }

  async function handleSendTest() {
    setBusy(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      })
      const json = await res.json()
      if (json.notification) {
        setToast(json.notification)
        void fetchNotifications()
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkSingleRead(id: number) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id }),
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {}
  }

  const filtered = notifications.filter((n) => (activeTab === 'all' ? true : n.type === activeTab))

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Floating Live Toast Alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`rounded-2xl border p-4 shadow-2xl backdrop-blur-xl bg-surface/95 flex items-start gap-3 ${
              LEVEL_COLORS[toast.level]?.border ?? 'border-line'
            }`}
          >
            <span className="text-2xl shrink-0 mt-0.5">
              {TYPE_ICONS[toast.type] ?? '📢'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-ink truncate">{toast.title}</h4>
                <span className="text-[10px] text-subtle shrink-0">just now</span>
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-subtle hover:text-ink text-sm font-bold leading-none p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bell Icon Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative rounded-xl border p-2 text-muted transition hover:border-accent hover:text-ink ${
          open ? 'border-accent bg-accent/10 text-accent shadow-xs' : 'border-line bg-surface-2'
        }`}
        title="Notifications & Live Activity"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl border border-line bg-surface p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <h3 className="text-sm font-bold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.2 text-[10px] font-bold text-rose-400">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleMarkAllRead}
                  className="text-accent hover:underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleClearAll}
                  className="text-subtle hover:text-ink font-semibold ml-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Desktop Push Permissions Bar */}
          {!hasWebNotification && (
            <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 flex items-center justify-between text-xs">
              <span className="text-[11px] text-indigo-300 font-medium">
                Enable desktop alerts for live orders
              </span>
              <button
                type="button"
                onClick={requestDesktopPermission}
                className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-bold transition shadow-xs cursor-pointer"
              >
                Enable
              </button>
            </div>
          )}

          {/* Type Filter Pills */}
          <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 text-[11px] fancy-scrollbar-subtle">
            {[
              { id: 'all', label: 'All' },
              { id: 'trade', label: '💼 Trades' },
              { id: 'hot-coin', label: '🔥 Hot' },
              { id: 'risk', label: '🛡️ Risk' },
              { id: 'signal', label: '⚡ Signals' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-subtle hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1 fancy-scrollbar">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-subtle space-y-2">
                <p>No notifications in this category yet.</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSendTest}
                  className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-ink hover:border-accent hover:text-accent transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? 'Sending…' : '⚡ Send Test Alert'}
                </button>
              </div>
            ) : (
              filtered.map((item) => {
                const styling = LEVEL_COLORS[item.level] ?? LEVEL_COLORS.info
                const icon = TYPE_ICONS[item.type] ?? '📢'

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkSingleRead(item.id)}
                    className={`group relative rounded-2xl border p-3 text-xs transition cursor-pointer hover:bg-surface-2/80 ${
                      item.read === 0
                        ? `${styling.border} ${styling.bg} shadow-xs ring-1 ring-accent/20`
                        : 'border-line/60 bg-surface/50 opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-ink truncate">{item.title}</h4>
                          <span className="text-[10px] text-subtle shrink-0 font-mono">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-muted text-[11px] leading-relaxed">
                          {item.message}
                        </p>
                        {item.symbol && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="rounded-md border border-line bg-surface px-1.5 py-0.2 text-[9px] font-bold text-subtle uppercase">
                              {item.symbol}
                            </span>
                            {item.read === 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-[11px] text-subtle">
            <span>Syncs with Telegram Bot</span>
            <button
              type="button"
              disabled={busy}
              onClick={handleSendTest}
              className="text-accent hover:underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Sending…' : 'Test Notification'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
