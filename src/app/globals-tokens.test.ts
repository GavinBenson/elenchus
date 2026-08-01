import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * globals.css declares the light palette in `@theme` and the dark counterpart
 * in `.dark`. Nothing structural ties the two together: add a nineteenth token
 * to one block and forget the other, and dark-mode users silently get a
 * light-palette colour with no test failing and no build error.
 *
 * Only `--color-*` is compared — `--font-*` is theme-independent by design.
 */
const CSS = readFileSync(path.resolve(__dirname, 'globals.css'), 'utf8')

function blockBody(source: string, opener: string): string {
  const start = source.indexOf(opener)
  if (start === -1) throw new Error(`block not found: ${opener}`)
  const from = start + opener.length
  const end = source.indexOf('}', from)
  if (end === -1) throw new Error(`unterminated block: ${opener}`)
  return source.slice(from, end)
}

function colorTokens(body: string): Set<string> {
  return new Set(Array.from(body.matchAll(/--color-[\w-]+/g), (m) => m[0]))
}

describe('light/dark colour token parity', () => {
  const light = colorTokens(blockBody(CSS, '@theme {'))
  const dark = colorTokens(blockBody(CSS, '.dark {'))

  it('finds a non-trivial number of tokens in each block', () => {
    expect(light.size).toBeGreaterThan(10)
    expect(dark.size).toBeGreaterThan(10)
  })

  it('defines exactly the same colour tokens in @theme and .dark', () => {
    const missingFromDark = [...light].filter((t) => !dark.has(t)).sort()
    const missingFromLight = [...dark].filter((t) => !light.has(t)).sort()
    expect(missingFromDark).toEqual([])
    expect(missingFromLight).toEqual([])
  })
})
