'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SettingsButtonProps {
  className?: string
  children?: React.ReactNode
  title?: string
  loadingLabel?: string
}

/**
 * Interactive Settings Navigation Button with instant click loading indicator,
 * route prefetching, and state feedback to prevent perceived navigation lag.
 */
export function SettingsButton({
  className = '',
  children,
  title = 'Configure layout, themes, alerts, and trading',
  loadingLabel = 'Opening Settings…',
}: SettingsButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Proactively prefetch the settings route so chunks are primed in browser cache
    try {
      router.prefetch('/settings')
    } catch {}
  }, [router])

  // Automatically reset loading if user cancels or after navigation window expires
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      setLoading(false)
    }, 8000)
    return () => clearTimeout(timer)
  }, [loading])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      router.push('/settings')
    } catch {
      setLoading(false)
    }
  }

  const defaultClasses = `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
    loading
      ? 'border-accent/60 bg-accent/15 text-accent shadow-xs cursor-wait'
      : 'border-line text-muted hover:bg-surface-2 hover:text-ink'
  }`

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => {
        try {
          router.prefetch('/settings')
        } catch {}
      }}
      disabled={loading}
      title={title}
      className={className ? `${className} ${loading ? 'cursor-wait opacity-80' : ''}` : defaultClasses}
    >
      {loading ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent shrink-0" />
          <span className="font-semibold text-accent animate-pulse">{loadingLabel}</span>
        </span>
      ) : (
        children ?? (
          <>
            <span>⚙</span>
            <span>Settings</span>
          </>
        )
      )}
    </button>
  )
}
