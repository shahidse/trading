'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import {
  COLOR_MODE_KEY,
  DEFAULT_LAYOUT,
  DEFAULT_MODE,
  DEFAULT_STYLE,
  LAYOUT_OPTIONS,
  LAYOUT_TYPE_KEY,
  LIGHT_MODES,
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
  const attr = document.documentElement.getAttribute('data-mode') as ColorMode | null
  const validModes: ColorMode[] = [
    'light',
    'warm-light',
    'candlelight',
    'aurora-glow',
    'cyber-glow',
    'dusk',
    'dark',
    'oled',
  ]
  if (attr && validModes.includes(attr)) return attr
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Hook providing the active archetype themeStyle, layoutType, and ambient lighting colorMode,
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
    const isDarkish = next !== 'light' && next !== 'warm-light'
    root.classList.toggle('dark', isDarkish)
    root.setAttribute('data-mode', next)
    root.style.colorScheme = isDarkish ? 'dark' : 'light'
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
    const current = readMode()
    const modes: ColorMode[] = ['light', 'warm-light', 'dusk', 'dark', 'oled']
    const nextIdx = (modes.indexOf(current) + 1) % modes.length
    setTheme(modes[nextIdx])
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

/**
 * Dedicated Color Theme Selector Grid (8 distinct curated aesthetic themes).
 */
export function ThemeStyleGrid() {
  const { themeStyle, setThemeStyle } = useTheme()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {THEME_STYLES.map((style) => {
        const active = style.id === themeStyle
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => setThemeStyle(style.id)}
            className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
              active
                ? 'border-accent bg-accent/10 shadow-md ring-1 ring-accent'
                : 'border-line bg-surface-2 hover:border-line-soft hover:bg-surface'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-xl">{style.icon}</span>
              <span
                className="h-3 w-3 rounded-full border border-black/20 dark:border-white/20 shadow-xs"
                style={{ backgroundColor: style.previewColor }}
              />
            </div>
            <span className="text-xs font-bold text-ink">{style.label}</span>
            <p className="text-[11px] text-subtle mt-0.5 line-clamp-2">{style.desc}</p>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Interactive Color Theme Dropdown Menu for Navbar / Toolbar.
 */
export function ThemeStyleMenu() {
  const { themeStyle, setThemeStyle } = useTheme()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const activeStyle = THEME_STYLES.find((s) => s.id === themeStyle) || THEME_STYLES[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={`Color Theme: ${activeStyle.label} (${activeStyle.desc}) · Click to change`}
        className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:bg-surface-2"
      >
        <span
          className="h-2 w-2 rounded-full border border-black/20 dark:border-white/20"
          style={{ backgroundColor: activeStyle.previewColor }}
        />
        <span>{activeStyle.icon}</span>
        <span className="font-medium text-muted hidden sm:inline">{activeStyle.label}</span>
        <span className="text-[10px] text-subtle">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-64 origin-top-right rounded-2xl border border-line bg-surface p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 border-b border-line-soft mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">
              Color Theme Palettes (10)
            </span>
            <p className="text-[11px] text-muted">Select your aesthetic styling system</p>
          </div>
          <div className="max-h-[380px] overflow-y-auto fancy-scrollbar space-y-1 pr-1">
            {THEME_STYLES.map((s) => {
              const isSelected = s.id === themeStyle
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setThemeStyle(s.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                    isSelected
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <span className="text-base mt-0.5">{s.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{s.label}</span>
                      <span
                        className="h-2 w-2 rounded-full border border-line"
                        style={{ backgroundColor: s.previewColor }}
                      />
                    </div>
                    <p className="text-[10px] text-subtle leading-tight">{s.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Dedicated Ambient Light Setup Selector (8 Light Levels to match your environment).
 */
export function AmbientLightSelector() {
  const { colorMode, setTheme } = useTheme()

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-xs fancy-scrollbar-subtle overflow-x-auto">
      {LIGHT_MODES.map((item) => {
        const active = item.id === colorMode
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTheme(item.id)}
            title={`${item.label} · ${item.ambientTitle} (${item.desc})`}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              active
                ? 'bg-accent text-white shadow-xs ring-1 ring-accent'
                : 'text-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            <span
              className="h-2 w-2 rounded-full border border-black/20 dark:border-white/20 shrink-0"
              style={{ backgroundColor: item.bgPreview }}
            />
            <span>{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Interactive Dropdown / Compact Ambient Light Switcher.
 */
export function AmbientLightMenu() {
  const { colorMode, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const activeMode = LIGHT_MODES.find((m) => m.id === colorMode) || LIGHT_MODES[3]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={`Ambient Lighting: ${activeMode.label} · Click to adjust`}
        className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:bg-surface-2"
      >
        <span
          className="h-2 w-2 rounded-full border border-black/20 dark:border-white/20"
          style={{ backgroundColor: activeMode.bgPreview }}
        />
        <span>{activeMode.icon}</span>
        <span className="font-medium text-muted hidden md:inline">{activeMode.label}</span>
        <span className="text-[10px] text-subtle">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-68 origin-top-right rounded-2xl border border-line bg-surface p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 border-b border-line-soft mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">
              Ambient Room Lighting (8 Setups)
            </span>
            <p className="text-[11px] text-muted">Adjust screen illumination to room lighting</p>
          </div>
          <div className="max-h-[380px] overflow-y-auto fancy-scrollbar space-y-1 pr-1">
            {LIGHT_MODES.map((mode) => {
              const isSelected = mode.id === colorMode
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setTheme(mode.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                    isSelected
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <span className="text-base mt-0.5">{mode.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{mode.label}</span>
                      <span
                        className="h-2 w-2 rounded-full border border-line"
                        style={{ backgroundColor: mode.bgPreview }}
                      />
                    </div>
                    <p className="text-[10px] text-subtle">{mode.ambientTitle}</p>
                    <p className="text-[10px] text-muted leading-tight">{mode.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Dynamic ambient room lighting backglow that reflects ambient light
 * mode (Aurora Borealis, Candlelight Hearth, or Cyber Hologram) softly
 * behind the interface.
 */
export function AmbientAtmosphereGlow() {
  const { colorMode } = useTheme()

  if (colorMode === 'oled') return null

  let glowClass = ''
  if (colorMode === 'aurora-glow') glowClass = 'ambient-glow-aurora opacity-75'
  else if (colorMode === 'candlelight') glowClass = 'ambient-glow-candle opacity-80'
  else if (colorMode === 'cyber-glow') glowClass = 'ambient-glow-cyber opacity-70'
  else return null

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-700 ${glowClass}`}
    />
  )
}

/** Modern Theme Switcher Bar with Theme Dropdown & Ambient Light Dropdown */
export function ThemeToggle() {
  return (
    <div className="flex items-center gap-2">
      <ThemeStyleMenu />
      <AmbientLightMenu />
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
