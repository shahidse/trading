'use client'

import { useCallback, useEffect, useState } from 'react'
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Active theme plus a setter. Re-renders when the theme changes anywhere in the
 * app (components announce changes via a `themechange` window event), which lets
 * canvas-based widgets like the chart recolour themselves.
 */
export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (theme: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    setThemeState(readTheme())
    const sync = () => setThemeState(readTheme())
    window.addEventListener('themechange', sync)
    return () => window.removeEventListener('themechange', sync)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement
    root.classList.toggle('dark', next === 'dark')
    root.style.colorScheme = next
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private mode / storage disabled — the class change still applies.
    }
    window.dispatchEvent(new Event('themechange'))
  }, [])

  const toggle = useCallback(() => {
    setTheme(readTheme() === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  return { theme, toggle, setTheme }
}

/** Light/dark switch for the page header. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
    >
      <span aria-hidden>{isDark ? '☀' : '☾'}</span>
      <span className="ml-1.5">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
