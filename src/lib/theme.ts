export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'elenchus-theme'

/**
 * Decides the theme to paint on first load. A stored choice always wins;
 * otherwise fall back to the OS preference. Any stored value that is not a
 * valid theme is treated as if nothing were stored.
 */
export function resolveInitialTheme(
  stored: string | null,
  prefersDark: boolean
): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}
