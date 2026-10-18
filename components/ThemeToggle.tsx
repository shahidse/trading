'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  COLOR_MODE_KEY,
  DEFAULT_LAYOUT,
  DEFAULT_MODE,
  DEFAULT_STYLE,
  LAYOUT_OPTIONS,
  LAYOUT_TYPE_KEY,
  THEME_STYLE_KEY,
  THEME_STYLES,
  type ColorMode,
  type LayoutType,
  type ThemeStyle,
} from '@/lib/theme'

export type Theme = ColorMode

function readStyle(): ThemeStyle {
  if (typeof document === 'undefined') return DEFAULT_STYLE
  return (document.documentElement.getAttribute('data-style') as ThemeStyle) || DEFAULT_STYLE
}

function readLayout(): LayoutType {
  if (typeof document === 'undefined') return DEFAULT_LAYOUT
  return (document.documentElement.getAttribute('data-layout') as LayoutType) || DEFAULT_LAYOUT
}

function readMode(): ColorMode {
  if (typeof document === 'undefined') return DEFAULT_MODE
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Hook providing the active archetype themeStyle, layoutType, and colorMode (dark/light),
 * along with setters and togglers that broadcast changes across the app.
 */
export function useTheme(): {
  theme: ColorMode
  themeStyle: ThemeStyle
  layoutType: LayoutType
  colorMode: ColorMode
  toggle: () => void
  setTheme: (theme: ColorMode) => void
  setThemeStyle: (style: ThemeStyle) => void
  setLayoutType: (layout: LayoutType) => void
} {
  const [style, setStyleState] = useState<ThemeStyle>(DEFAULT_STYLE)
  const [layout, setLayoutState] = useState<LayoutType>(DEFAULT_LAYOUT)
  const [mode, setModeState] = useState<ColorMode>(DEFAULT_MODE)

  useEffect(() => {
    setStyleState(readStyle())
    setLayoutState(readLayout())
    setModeState(readMode())

    const sync = () => {
      setStyleState(readStyle())
      setLayoutState(readLayout())
      setModeState(readMode())
    }

    window.addEventListener('themechange', sync)
    return () => window.removeEventListener('themechange', sync)
  }, [])

  const setTheme = useCallback((next: ColorMode) => {
    const root = document.documentElement
    root.classList.toggle('dark', next === 'dark')
    root.setAttribute('data-mode', next)
    root.style.colorScheme = next
    try {
      localStorage.setItem(COLOR_MODE_KEY, next)
    } catch {}
    window.dispatchEvent(new Event('themechange'))
  }, [])

  const setThemeStyle = useCallback((nextStyle: ThemeStyle) => {
    const root = document.documentElement
    root.setAttribute('data-style', nextStyle)
    try {
      localStorage.setItem(THEME_STYLE_KEY, nextStyle)
    } catch {}
    window.dispatchEvent(new Event('themechange'))
  }, [])

  const setLayoutType = useCallback((nextLayout: LayoutType) => {
    const root = document.documentElement
    root.setAttribute('data-layout', nextLayout)
    try {
      localStorage.setItem(LAYOUT_TYPE_KEY, nextLayout)
    } catch {}
    window.dispatchEvent(new Event('themechange'))
  }, [])

  const toggle = useCallback(() => {
    setTheme(readMode() === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  return {
    theme: mode,
    themeStyle: style,
    layoutType: layout,
    colorMode: mode,
    toggle,
    setTheme,
    setThemeStyle,
    setLayoutType,
  }
}

/** Modern Theme Switcher Bar with Archetype Selector & Light/Dark Mode Toggle */
export function ThemeToggle() {
  const { themeStyle, colorMode, toggle, setThemeStyle } = useTheme()
  const isDark = colorMode === 'dark'

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-xs">
      {/* 4 Archetype tabs */}
      <div className="flex items-center gap-1">
        {THEME_STYLES.map((s) => {
          const active = s.id === themeStyle
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setThemeStyle(s.id)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                active
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`}
              title={s.label}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          )
        })}
      </div>

      <div className="h-4 w-px bg-line" />

      {/* Dark / Light Toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
      >
        <span aria-hidden>{isDark ? '☀️' : '🌙'}</span>
        <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  )
}

/** Layout Switcher Bar for the 5 Core Layouts */
export function LayoutSelector() {
  const { layoutType, setLayoutType } = useTheme()

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-xs">
      {LAYOUT_OPTIONS.map((layout) => {
        const active = layout.id === layoutType
        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => setLayoutType(layout.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              active
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:bg-surface-2 hover:text-ink'
            }`}
            title={`${layout.label} · ${layout.uxFocus}`}
          >
            <span>{layout.icon}</span>
            <span>{layout.label}</span>
          </button>
        )
      })}
    </div>
  )
}
