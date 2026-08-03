// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ApplicantFilters } from './ApplicantFilters'
import type { ApplicantFilters as Filters } from '@/lib/applicants-query'

const { replaceMock, usePathnameMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  usePathnameMock: vi.fn(() => '/applicants'),
}))

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}))

const POSTINGS = [
  { id: 'p1', title: 'Backend Engineer' },
  { id: 'p2', title: 'Recruiter' },
]

const NO_FILTERS: Filters = { query: '', stage: null, postingId: null }

function renderFilters(filters: Partial<Filters> = {}) {
  return render(
    <ApplicantFilters filters={{ ...NO_FILTERS, ...filters }} postings={POSTINGS} />
  )
}

beforeEach(() => {
  replaceMock.mockClear()
})

describe('ApplicantFilters', () => {
  it('renders the three contract test ids', () => {
    renderFilters()
    expect(screen.getByTestId('applicants-search')).toBeInTheDocument()
    expect(screen.getByTestId('filter-stage')).toBeInTheDocument()
    expect(screen.getByTestId('filter-role')).toBeInTheDocument()
  })

  it('offers every stage plus an all-stages option, and every posting', () => {
    renderFilters()
    const stages = screen.getByTestId('filter-stage') as HTMLSelectElement
    expect([...stages.options].map((o) => o.value)).toEqual([
      '',
      'applied',
      'interview',
      'offer',
      'hired',
      'rejected',
    ])

    const roles = screen.getByTestId('filter-role') as HTMLSelectElement
    expect([...roles.options].map((o) => o.value)).toEqual(['', 'p1', 'p2'])
  })

  it('shows the filters currently encoded in the URL as the selected values', () => {
    renderFilters({ query: 'grace', stage: 'offer', postingId: 'p2' })
    expect(screen.getByTestId('applicants-search')).toHaveValue('grace')
    expect(screen.getByTestId('filter-stage')).toHaveValue('offer')
    expect(screen.getByTestId('filter-role')).toHaveValue('p2')
  })

  it('navigates immediately when a stage is picked', () => {
    renderFilters()

    fireEvent.change(screen.getByTestId('filter-stage'), { target: { value: 'interview' } })

    expect(replaceMock).toHaveBeenCalledWith('/applicants?stage=interview', { scroll: false })
  })

  it('keeps the other filters when one of them changes', () => {
    renderFilters({ query: 'grace', stage: 'offer' })

    fireEvent.change(screen.getByTestId('filter-role'), { target: { value: 'p1' } })

    expect(replaceMock).toHaveBeenCalledWith('/applicants?q=grace&stage=offer&posting=p1', {
      scroll: false,
    })
  })

  it('clears a filter from the URL when it is set back to all', () => {
    renderFilters({ stage: 'offer', postingId: 'p1' })

    fireEvent.change(screen.getByTestId('filter-stage'), { target: { value: '' } })

    expect(replaceMock).toHaveBeenCalledWith('/applicants?posting=p1', { scroll: false })
  })
})

describe('ApplicantFilters — search debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('issues one navigation for a burst of typing, not one per character', async () => {
    renderFilters()

    const search = screen.getByTestId('applicants-search')
    for (const value of ['g', 'gr', 'gra', 'grac', 'grace']) {
      fireEvent.change(search, { target: { value } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(40)
      })
    }
    expect(replaceMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })

    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith('/applicants?q=grace', { scroll: false })
  })

  it('does not navigate when the box already matches the URL', async () => {
    renderFilters({ query: 'grace' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(replaceMock).not.toHaveBeenCalled()
  })
})
