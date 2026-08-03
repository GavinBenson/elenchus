import { describe, it, expect } from 'vitest'
import {
  OFFER_AGING_DAYS,
  applicantWhere,
  daysInStage,
  isAgingOffer,
  parseApplicantFilters,
  sortForReview,
} from './applicants-query'

describe('parseApplicantFilters', () => {
  it('defaults to no filters when the query string is empty', () => {
    expect(parseApplicantFilters({})).toEqual({ query: '', stage: null, postingId: null })
  })

  it('reads query, stage, and posting from their search params', () => {
    expect(parseApplicantFilters({ q: 'grace', stage: 'offer', posting: 'abc123' })).toEqual({
      query: 'grace',
      stage: 'offer',
      postingId: 'abc123',
    })
  })

  it('trims surrounding whitespace from the search query', () => {
    expect(parseApplicantFilters({ q: '  grace  ' }).query).toBe('grace')
  })

  it('ignores a stage value that is not one of the five real stages', () => {
    // A hand-edited URL must not reach Prisma as an arbitrary string.
    expect(parseApplicantFilters({ stage: 'archived' }).stage).toBeNull()
  })

  it('takes the first value when a param is repeated', () => {
    expect(parseApplicantFilters({ q: ['grace', 'morgan'], stage: ['offer', 'hired'] })).toEqual({
      query: 'grace',
      stage: 'offer',
      postingId: null,
    })
  })
})

describe('applicantWhere', () => {
  it('is an empty filter when nothing is selected', () => {
    expect(applicantWhere({ query: '', stage: null, postingId: null })).toEqual({})
  })

  it('filters by stage and posting exactly', () => {
    expect(applicantWhere({ query: '', stage: 'offer', postingId: 'abc123' })).toEqual({
      stage: 'offer',
      jobPostingId: 'abc123',
    })
  })

  it('searches name and email case-insensitively', () => {
    const where = applicantWhere({ query: 'Grace', stage: null, postingId: null })
    expect(where.OR).toEqual([
      { name: { contains: 'Grace', mode: 'insensitive' } },
      { email: { contains: 'Grace', mode: 'insensitive' } },
    ])
  })

  it('matches a curly-apostrophe name when the user types a straight apostrophe', () => {
    // The seed deliberately contains `Grace O’Sullivan` (U+2019). A recruiter
    // types U+0027, and an exact `contains` would find nothing.
    const where = applicantWhere({ query: "O'Sullivan", stage: null, postingId: null })
    const needles = (where.OR ?? []).map((clause) =>
      'name' in clause ? clause.name.contains : clause.email.contains
    )
    expect(needles).toContain('O’Sullivan')
  })

  it('matches a straight-apostrophe name when the user types a curly one', () => {
    const where = applicantWhere({ query: 'O’Sullivan', stage: null, postingId: null })
    const needles = (where.OR ?? []).map((clause) =>
      'name' in clause ? clause.name.contains : clause.email.contains
    )
    expect(needles).toContain("O'Sullivan")
  })

  it('composes search with both filters rather than replacing them', () => {
    const where = applicantWhere({ query: 'grace', stage: 'offer', postingId: 'abc123' })
    expect(where.stage).toBe('offer')
    expect(where.jobPostingId).toBe('abc123')
    expect(where.OR).toBeDefined()
  })
})

describe('daysInStage', () => {
  const now = new Date('2026-08-02T09:30:00.000Z')

  it('is 0 for a stage entered earlier the same day', () => {
    expect(daysInStage(new Date('2026-08-02T01:00:00.000Z'), now)).toBe(0)
  })

  it('counts whole elapsed days, not calendar boundaries crossed', () => {
    // 23h59m ago is still "0 days in stage", even across midnight.
    expect(daysInStage(new Date('2026-08-01T09:31:00.000Z'), now)).toBe(0)
    expect(daysInStage(new Date('2026-08-01T09:29:00.000Z'), now)).toBe(1)
  })

  it('never reports a negative age for a future timestamp', () => {
    expect(daysInStage(new Date('2026-08-03T00:00:00.000Z'), now)).toBe(0)
  })
})

describe('isAgingOffer', () => {
  const now = new Date('2026-08-02T00:00:00.000Z')
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)

  it('flags an offer older than the aging threshold', () => {
    expect(
      isAgingOffer({ stage: 'offer', stageChangedAt: daysAgo(OFFER_AGING_DAYS + 1) }, now)
    ).toBe(true)
  })

  it('does not flag an offer exactly at the threshold', () => {
    expect(isAgingOffer({ stage: 'offer', stageChangedAt: daysAgo(OFFER_AGING_DAYS) }, now)).toBe(
      false
    )
  })

  it('never flags a stage other than offer, however old', () => {
    for (const stage of ['applied', 'interview', 'hired', 'rejected']) {
      expect(isAgingOffer({ stage, stageChangedAt: daysAgo(400) }, now)).toBe(false)
    }
  })
})

describe('sortForReview', () => {
  const now = new Date('2026-08-02T00:00:00.000Z')
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)

  const freshOffer = { name: 'Fresh Offer', stage: 'offer', stageChangedAt: daysAgo(2) }
  const agingOffer = { name: 'Aging Offer', stage: 'offer', stageChangedAt: daysAgo(14) }
  const olderAgingOffer = { name: 'Older Aging', stage: 'offer', stageChangedAt: daysAgo(30) }
  const oldRejection = { name: 'Old Rejection', stage: 'rejected', stageChangedAt: daysAgo(40) }
  const recentApplied = { name: 'Recent Applied', stage: 'applied', stageChangedAt: daysAgo(1) }

  it('puts aging offers above everything else, however recent the rest is', () => {
    const sorted = sortForReview([recentApplied, oldRejection, agingOffer, freshOffer], now)
    expect(sorted[0]).toBe(agingOffer)
  })

  it('orders aging offers longest-outstanding first', () => {
    const sorted = sortForReview([agingOffer, olderAgingOffer], now)
    expect(sorted.map((a) => a.name)).toEqual(['Older Aging', 'Aging Offer'])
  })

  it('orders everything else by most recent activity, so settled rows sink', () => {
    const sorted = sortForReview([oldRejection, freshOffer, recentApplied], now)
    expect(sorted.map((a) => a.name)).toEqual(['Recent Applied', 'Fresh Offer', 'Old Rejection'])
  })

  it('breaks ties on identical timestamps by name, so the order is stable', () => {
    const b = { name: 'Bea', stage: 'applied', stageChangedAt: daysAgo(3) }
    const a = { name: 'Ana', stage: 'applied', stageChangedAt: daysAgo(3) }
    expect(sortForReview([b, a], now).map((x) => x.name)).toEqual(['Ana', 'Bea'])
  })

  it('does not mutate the array it is given', () => {
    const input = [oldRejection, agingOffer]
    sortForReview(input, now)
    expect(input).toEqual([oldRejection, agingOffer])
  })
})
