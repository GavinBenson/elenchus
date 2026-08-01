import { describe, it, expect } from 'vitest'
import { resolveInitialTheme } from './theme'

describe('resolveInitialTheme', () => {
  it('honours a stored preference over the OS setting', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark')
    expect(resolveInitialTheme('light', true)).toBe('light')
  })

  it('falls back to the OS setting when nothing is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('ignores a stored value that is not a valid theme', () => {
    expect(resolveInitialTheme('banana', true)).toBe('dark')
    expect(resolveInitialTheme('', false)).toBe('light')
  })
})
