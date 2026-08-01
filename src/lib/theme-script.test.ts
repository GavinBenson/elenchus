import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { THEME_STORAGE_KEY } from './theme'

describe('pre-paint theme script in layout.tsx', () => {
  it('stays in sync with theme.ts', async () => {
    const layoutPath = path.resolve(__dirname, '../app/layout.tsx')
    const contents = await readFile(layoutPath, 'utf-8')

    const keyPattern = new RegExp(
      `['"]${THEME_STORAGE_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`
    )
    expect(contents).toMatch(keyPattern)
    expect(contents).toContain("'light'")
    expect(contents).toContain("'dark'")
    expect(contents).toContain('prefers-color-scheme: dark')
    expect(contents).toContain('document.documentElement')
    expect(contents).toMatch(/classList\.add\(\s*['"]dark['"]\s*\)/)
  })
})
