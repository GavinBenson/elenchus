import { describe, it, expect } from 'vitest'
import { stageDistribution } from './stage-distribution'

describe('stageDistribution', () => {
  it('is empty when there are no applicants, rather than five zero-width segments', () => {
    expect(stageDistribution({ applied: 0, interview: 0, offer: 0, hired: 0, rejected: 0 })).toEqual(
      []
    )
  })

  it('omits stages with no one in them', () => {
    const segments = stageDistribution({
      applied: 3,
      interview: 0,
      offer: 1,
      hired: 0,
      rejected: 0,
    })
    expect(segments.map((s) => s.stage)).toEqual(['applied', 'offer'])
  })

  it('reports each stage as a percentage of the total', () => {
    const segments = stageDistribution({
      applied: 5,
      interview: 3,
      offer: 1,
      hired: 1,
      rejected: 0,
    })
    expect(segments.find((s) => s.stage === 'applied')).toMatchObject({ count: 5, percent: 50 })
    expect(segments.find((s) => s.stage === 'interview')).toMatchObject({ percent: 30 })
  })

  it('keeps percentages summing to 100 despite rounding', () => {
    // Three equal parts round to 33.3 each and would leave a visible gap at the
    // end of the bar if each were rounded independently.
    const segments = stageDistribution({
      applied: 1,
      interview: 1,
      offer: 1,
      hired: 0,
      rejected: 0,
    })
    const total = segments.reduce((sum, s) => sum + s.percent, 0)
    expect(total).toBe(100)
  })

  it('gives a single stage the whole bar', () => {
    const segments = stageDistribution({
      applied: 7,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
    })
    expect(segments).toHaveLength(1)
    expect(segments[0].percent).toBe(100)
  })

  it('keeps stages in pipeline order rather than by size', () => {
    const segments = stageDistribution({
      applied: 1,
      interview: 9,
      offer: 2,
      hired: 4,
      rejected: 3,
    })
    expect(segments.map((s) => s.stage)).toEqual([
      'applied',
      'interview',
      'offer',
      'hired',
      'rejected',
    ])
  })
})
