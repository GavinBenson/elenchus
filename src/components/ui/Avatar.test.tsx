// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar, initialsFor } from './Avatar'

describe('initialsFor', () => {
  it('takes the first letter of the first and last name', () => {
    expect(initialsFor('Dana Whitfield')).toBe('DW')
    expect(initialsFor('Priya Raghunathan')).toBe('PR')
  })

  it('handles a single name', () => {
    expect(initialsFor('Cher')).toBe('C')
  })

  it('skips middle names rather than including them', () => {
    expect(initialsFor('Ana Beatriz Lima')).toBe('AL')
  })

  it('handles names with punctuation and non-ASCII characters', () => {
    expect(initialsFor('Grace O’Sullivan')).toBe('GO')
    expect(initialsFor('Oskar Novák')).toBe('ON')
  })

  it('returns an empty string for an empty name rather than throwing', () => {
    expect(initialsFor('')).toBe('')
    expect(initialsFor('   ')).toBe('')
  })
})

describe('Avatar', () => {
  it('renders the initials', () => {
    render(<Avatar name="Dana Whitfield" data-testid="a" />)
    expect(screen.getByTestId('a')).toHaveTextContent('DW')
  })

  it('gives the same name the same hue every time', () => {
    const { unmount } = render(<Avatar name="Dana Whitfield" data-testid="a" />)
    const first = screen.getByTestId('a').getAttribute('style')
    unmount()
    render(<Avatar name="Dana Whitfield" data-testid="a" />)
    expect(screen.getByTestId('a').getAttribute('style')).toBe(first)
  })

  it('gives different names different hues', () => {
    const { unmount } = render(<Avatar name="Dana Whitfield" data-testid="a" />)
    const first = screen.getByTestId('a').getAttribute('style')
    unmount()
    render(<Avatar name="Marcus Oyelaran" data-testid="a" />)
    expect(screen.getByTestId('a').getAttribute('style')).not.toBe(first)
  })
})
