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
      const className = screen.getByTestId('b').className
      expect(className).toContain(`stage-${stage}`)
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
})
