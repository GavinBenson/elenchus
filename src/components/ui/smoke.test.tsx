// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('component test infrastructure', () => {
  it('renders a React component into jsdom', () => {
    render(<button data-testid="smoke">Click</button>)
    expect(screen.getByTestId('smoke')).toHaveTextContent('Click')
  })
})
