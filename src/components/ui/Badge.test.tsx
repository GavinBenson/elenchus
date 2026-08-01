// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

const STAGES = ['applied', 'interview', 'offer', 'hired', 'rejected'] as const

describe('Badge', () => {
  it('renders a human-readable label for each stage', () => {
    render(<Badge stage="interview" data-testid="b" />)
    expect(screen.getByTestId('b')).toHaveTextContent('Interview')
  })

  it('gives every stage its own distinct classes', () => {
    const seen = new Set<string>()
    for (const stage of STAGES) {
      const { unmount } = render(<Badge stage={stage} data-testid="b" />)
      const classes = screen.getByTestId('b').className.split(' ')
      const className = classes.join(' ')
      // Both complete tokens, not the `stage-<name>` substring: that substring
      // lives inside `bg-stage-applied-bg` alone, so a badge with the right
      // background and a mismatched foreground would otherwise pass.
      expect(classes).toContain(`bg-stage-${stage}-bg`)
      expect(classes).toContain(`text-stage-${stage}`)
      seen.add(className)
      unmount()
    }
    // Five stages must produce five different appearances, or the badges
    // stop being scannable at a glance.
    expect(seen.size).toBe(5)
  })

  it('forwards data-testid', () => {
    render(<Badge stage="hired" data-testid="custom-id" />)
    expect(screen.getByTestId('custom-id')).toBeInTheDocument()
  })

  it('merges a caller className and spreads native span attributes', () => {
    render(<Badge stage="hired" data-testid="b" className="px-8" id="badge-id" />)
    const el = screen.getByTestId('b')
    const classes = el.className.split(' ')
    expect(classes).toContain('px-8')
    expect(classes).not.toContain('px-2.5')
    expect(classes).toContain('text-stage-hired')
    expect(el).toHaveAttribute('id', 'badge-id')
  })
})
