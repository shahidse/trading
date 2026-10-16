/**
 * Theme plumbing shared by the server-rendered layout and the client toggle.
 *
 * Kept as a plain module (no `'use client'`) so the root layout — a Server
 * Component — can import the inline bootstrap script without pulling in a
 * client boundary.
 */

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'eth-signal-theme'

/** Default when nothing is stored: follow the OS, falling back to dark. */
export const DEFAULT_THEME: Theme = 'dark'

/**
 * Runs before first paint so the correct theme is applied with no flash.
 * Reads the stored preference, else the OS setting, then sets `.dark` on <html>.
 */
export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var d=s?s==='dark':!window.matchMedia('(prefers-color-scheme: light)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');}})();`
