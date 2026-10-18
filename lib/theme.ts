/**
 * Web Theme System for the 4 Design Archetypes with Light & Dark Modes:
 * 1. data-driven: Sleek Data-Driven Dark/Light Mode (Pro Quant)
 * 2. neofuturistic: Neofuturistic & AI-Integrated Minimalism (Cyan/Violet Synth)
 * 3. playful: Playful Consumer-Grade (Social-Fi & Memecoin / Hot Pink & Lime)
 * 4. brutalist: High-Contrast Neo-Brutalism & Editorial (Heavy Borders & Raw Contrast)
 */

export type ThemeStyle = 'data-driven' | 'neofuturistic' | 'playful' | 'brutalist'
export type ColorMode = 'dark' | 'light'
export type Theme = ColorMode

export type LayoutType =
  | 'sidebar'
  | 'multi-column'
  | 'canvas-floating'
  | 'bento-grid'
  | 'split-screen'

export const THEME_STYLE_KEY = 'eth-signal-theme-style'
export const COLOR_MODE_KEY = 'eth-signal-color-mode'
export const LAYOUT_TYPE_KEY = 'eth-signal-layout-type'

export const DEFAULT_STYLE: ThemeStyle = 'data-driven'
export const DEFAULT_MODE: ColorMode = 'dark'
export const DEFAULT_LAYOUT: LayoutType = 'multi-column'

export const THEME_STYLES: Array<{ id: ThemeStyle; label: string; icon: string }> = [
  { id: 'data-driven', label: 'Data-Driven', icon: '📊' },
  { id: 'neofuturistic', label: 'Neofuture AI', icon: '⚡' },
  { id: 'playful', label: 'Social-Fi', icon: '🚀' },
  { id: 'brutalist', label: 'Neo-Brutalist', icon: '📐' },
]

export const LAYOUT_OPTIONS: Array<{
  id: LayoutType
  label: string
  density: string
  mobileAdaptability: string
  uxFocus: string
  icon: string
}> = [
  {
    id: 'sidebar',
    label: 'Sidebar Navigation',
    density: 'Medium to High',
    mobileAdaptability: 'Requires collapsible menu / burger icon',
    uxFocus: 'Structured, hierarchical navigation',
    icon: '📑',
  },
  {
    id: 'multi-column',
    label: 'Multi-Column Workspace',
    density: 'Very High',
    mobileAdaptability: 'Collapses into tabs or stacked cards',
    uxFocus: 'Eliminates back-and-forth clicking',
    icon: '🏛️',
  },
  {
    id: 'canvas-floating',
    label: 'Canvas & Floating Panel',
    density: 'Infinite / Flexible',
    mobileAdaptability: 'Low (requires custom touch scaling)',
    uxFocus: 'Deep visual immersion and creation',
    icon: '🎨',
  },
  {
    id: 'bento-grid',
    label: 'Bento Grid',
    density: 'Medium',
    mobileAdaptability: 'Easily re-stacks vertically into 1-column',
    uxFocus: 'High-level overview and scannability',
    icon: '🍱',
  },
  {
    id: 'split-screen',
    label: 'Split-Screen',
    density: 'Low to Medium',
    mobileAdaptability: 'Stacked sequentially top-to-bottom',
    uxFocus: 'Side-by-side comparison or previewing',
    icon: '🪟',
  },
]

export const themeInitScript = `(function(){
  try {
    var s = localStorage.getItem('${THEME_STYLE_KEY}') || 'data-driven';
    var l = localStorage.getItem('${LAYOUT_TYPE_KEY}') || 'multi-column';
    var m = localStorage.getItem('${COLOR_MODE_KEY}');
    if (!m) {
      m = !window.matchMedia('(prefers-color-scheme: light)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.setAttribute('data-style', s);
    root.setAttribute('data-layout', l);
    root.setAttribute('data-mode', m);
    root.classList.toggle('dark', m === 'dark');
    root.style.colorScheme = m;
  } catch(e) {
    document.documentElement.setAttribute('data-style', 'data-driven');
    document.documentElement.setAttribute('data-layout', 'multi-column');
    document.documentElement.setAttribute('data-mode', 'dark');
    document.documentElement.classList.add('dark');
  }
})();`
