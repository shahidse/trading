/**
 * Web Theme System for the 8 Design Archetypes with 5 Ambient Lighting Setups:
 * 1. data-driven: Sleek Data-Driven Dark/Light Mode (Pro Quant Steel)
 * 2. neofuturistic: Neofuturistic & AI-Integrated Minimalism (Cyan/Violet Synth)
 * 3. emerald-quant: Cyber Emerald & Jade Matrix (Luminous Mint & Obsidian Green)
 * 4. midnight-gold: Obsidian Gold & Swiss Prestige (Bullion Gold & Onyx Velvet)
 * 5. nordic-frost: Nordic Frost & Glacial Aurora (Arctic Ice & Cyan Fjord)
 * 6. sunset-synth: Sunset Horizon & Tokyo Neon (Golden Hour Orange & Nebula Violet)
 * 7. playful: Playful Consumer-Grade (Social-Fi & Memecoin / Hot Pink & Lime)
 * 8. brutalist: High-Contrast Neo-Brutalism & Editorial (Heavy Borders & Raw Contrast)
 */

export type ThemeStyle =
  | 'data-driven'
  | 'neofuturistic'
  | 'emerald-quant'
  | 'midnight-gold'
  | 'nordic-frost'
  | 'sunset-synth'
  | 'playful'
  | 'brutalist'
  | 'hyper-matrix'
  | 'blood-moon'

export type ColorMode =
  | 'light'
  | 'warm-light'
  | 'dusk'
  | 'dark'
  | 'oled'
  | 'aurora-glow'
  | 'candlelight'
  | 'cyber-glow'

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

export const THEME_STYLES: Array<{
  id: ThemeStyle
  label: string
  desc: string
  icon: string
  previewColor: string
}> = [
  { id: 'data-driven', label: 'Data-Driven', desc: 'Pro Quant Terminal', icon: '📊', previewColor: '#0284c7' },
  { id: 'neofuturistic', label: 'Neofuture AI', desc: 'Cyberpunk Synth Glass', icon: '⚡', previewColor: '#7c3aed' },
  { id: 'hyper-matrix', label: 'Cyber Matrix', desc: 'Electric Aqua & Hologram Glass', icon: '🌐', previewColor: '#00f5d4' },
  { id: 'blood-moon', label: 'Blood Moon Noir', desc: 'Crimson Ruby & Onyx Velvet', icon: '🩸', previewColor: '#ff0055' },
  { id: 'emerald-quant', label: 'Cyber Emerald', desc: 'Jade & Mint Matrix', icon: '💎', previewColor: '#10b981' },
  { id: 'midnight-gold', label: 'Obsidian Gold', desc: 'Swiss Bullion Luxury', icon: '👑', previewColor: '#f59e0b' },
  { id: 'nordic-frost', label: 'Nordic Frost', desc: 'Arctic Glacial Aurora', icon: '❄️', previewColor: '#38bdf8' },
  { id: 'sunset-synth', label: 'Sunset Horizon', desc: 'Tokyo Sunset Neon', icon: '🌅', previewColor: '#f97316' },
  { id: 'playful', label: 'Social-Fi', desc: 'Memecoin & Hot Pink', icon: '🚀', previewColor: '#ec4899' },
  { id: 'brutalist', label: 'Neo-Brutalist', desc: 'High Contrast Editorial', icon: '📐', previewColor: '#000000' },
]

export const LIGHT_MODES: Array<{
  id: ColorMode
  label: string
  ambientTitle: string
  desc: string
  icon: string
  bgPreview: string
}> = [
  {
    id: 'light',
    label: 'Daylight',
    ambientTitle: 'Full Sun / Day',
    desc: 'Crisp bright daylight for sunlit spaces',
    icon: '☀️',
    bgPreview: '#ffffff',
  },
  {
    id: 'warm-light',
    label: 'Eye-Care Paper',
    ambientTitle: 'Warm Room / Paper',
    desc: 'Soft sepia paper, gentle on eyes',
    icon: '📖',
    bgPreview: '#fbf7ee',
  },
  {
    id: 'candlelight',
    label: 'Candlelight',
    ambientTitle: 'Golden 1800K Hearth',
    desc: 'Ultra-warm caramel amber, 0% eye strain',
    icon: '🕯️',
    bgPreview: '#160f08',
  },
  {
    id: 'aurora-glow',
    label: 'Aurora Glow',
    ambientTitle: 'Glacial Borealis Glow',
    desc: 'Luminous polar emerald & arctic violet lighting',
    icon: '✨',
    bgPreview: '#051824',
  },
  {
    id: 'cyber-glow',
    label: 'Cyber Cockpit',
    ambientTitle: 'Electric Neon Horizon',
    desc: 'Deep cyber terminal with radiant neon luminescence',
    icon: '⚡',
    bgPreview: '#060a17',
  },
  {
    id: 'dusk',
    label: 'Twilight Dim',
    ambientTitle: 'Dim Ambient / Sunset',
    desc: 'Muted charcoal slate for low lighting',
    icon: '🌆',
    bgPreview: '#1e2430',
  },
  {
    id: 'dark',
    label: 'Midnight',
    ambientTitle: 'Night Pro',
    desc: 'Classic deep navy dark mode',
    icon: '🌙',
    bgPreview: '#080c14',
  },
  {
    id: 'oled',
    label: 'OLED Zero',
    ambientTitle: 'Pitch Black / Zero Glow',
    desc: 'Pure #000000 true black for dark rooms',
    icon: '🖤',
    bgPreview: '#000000',
  },
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
    var validStyles = ['data-driven', 'neofuturistic', 'hyper-matrix', 'blood-moon', 'emerald-quant', 'midnight-gold', 'nordic-frost', 'sunset-synth', 'playful', 'brutalist'];
    var s = localStorage.getItem('${THEME_STYLE_KEY}') || 'data-driven';
    if (validStyles.indexOf(s) === -1) s = 'data-driven';

    var l = localStorage.getItem('${LAYOUT_TYPE_KEY}') || 'multi-column';
    var m = localStorage.getItem('${COLOR_MODE_KEY}') || 'dark';
    var validModes = ['light', 'warm-light', 'candlelight', 'aurora-glow', 'cyber-glow', 'dusk', 'dark', 'oled'];
    if (validModes.indexOf(m) === -1) {
      m = !window.matchMedia('(prefers-color-scheme: light)').matches ? 'dark' : 'light';
    }
    var isDarkish = m !== 'light' && m !== 'warm-light';
    var root = document.documentElement;
    root.setAttribute('data-style', s);
    root.setAttribute('data-layout', l);
    root.setAttribute('data-mode', m);
    root.classList.toggle('dark', isDarkish);
    root.style.colorScheme = isDarkish ? 'dark' : 'light';
  } catch(e) {
    document.documentElement.setAttribute('data-style', 'data-driven');
    document.documentElement.setAttribute('data-layout', 'multi-column');
    document.documentElement.setAttribute('data-mode', 'dark');
    document.documentElement.classList.add('dark');
  }
})();`
