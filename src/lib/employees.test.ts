import { describe, it, expect } from 'vitest'
import { isTerminated, sortRoster, tenureLabel } from './employees'

const now = new Date('2026-08-02T00:00:00.000Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)

describe('isTerminated', () => {
  it('treats anything other than active as terminated', () => {
    expect(isTerminated({ status: 'terminated' })).toBe(true)
    expect(isTerminated({ status: 'active' })).toBe(false)
  })

  it('does not treat an unexpected status as active', () => {
    // Better to dim a row we cannot classify than to present a departed
    // employee as current staff.
    expect(isTerminated({ status: 'on_leave' })).toBe(true)
  })
})

describe('sortRoster', () => {
  const ana = { name: 'Ana Lima', status: 'active' }
  const bea = { name: 'Bea Nkosi', status: 'active' }
  const zed = { name: 'Zed Marsh', status: 'terminated' }
  const abe = { name: 'Abe Cole', status: 'terminated' }

  it('puts active staff above terminated', () => {
    expect(sortRoster([zed, ana]).map((e) => e.name)).toEqual(['Ana Lima', 'Zed Marsh'])
  })

  it('orders alphabetically within each group', () => {
    expect(sortRoster([bea, abe, ana, zed]).map((e) => e.name)).toEqual([
      'Ana Lima',
      'Bea Nkosi',
      'Abe Cole',
      'Zed Marsh',
    ])
  })

  it('sorts a curly apostrophe next to its straight equivalent', () => {
    // The seed contains `Grace O’Sullivan` (U+2019) as a deliberate Unicode
    // edge case; a naive `<` comparison sorts U+2019 after every ASCII letter.
    const sorted = sortRoster([
      { name: 'Grace Zylberberg', status: 'active' },
      { name: 'Grace O’Sullivan', status: 'active' },
      { name: 'Grace Ahmed', status: 'active' },
    ])
    expect(sorted.map((e) => e.name)).toEqual([
      'Grace Ahmed',
      'Grace O’Sullivan',
      'Grace Zylberberg',
    ])
  })

  it('does not mutate the array it is given', () => {
    const input = [zed, ana]
    sortRoster(input)
    expect(input).toEqual([zed, ana])
  })
})

describe('tenureLabel', () => {
  it('reports months for a first-year hire', () => {
    // Months are floored, so 90 days is 2 months and change, not 3.
    expect(tenureLabel(daysAgo(90), now)).toBe('2 months')
    expect(tenureLabel(daysAgo(200), now)).toBe('6 months')
  })

  it('says less than a month for a brand new hire', () => {
    expect(tenureLabel(daysAgo(5), now)).toBe('less than a month')
  })

  it('singularises a single month', () => {
    expect(tenureLabel(daysAgo(40), now)).toBe('1 month')
  })

  it('reports whole years with no trailing months when there are none', () => {
    expect(tenureLabel(daysAgo(366), now)).toBe('1 year')
    expect(tenureLabel(daysAgo(731), now)).toBe('2 years')
  })

  it('adds remaining months to a year', () => {
    expect(tenureLabel(daysAgo(400), now)).toBe('1 year, 1 month')
    expect(tenureLabel(daysAgo(500), now)).toBe('1 year, 4 months')
  })

  it('handles a future hire date without reporting negative tenure', () => {
    expect(tenureLabel(new Date('2027-01-01T00:00:00.000Z'), now)).toBe('not started')
  })
})
