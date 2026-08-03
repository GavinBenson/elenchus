import { describe, it, expect } from 'vitest'
import { buildTimeline } from './applicant-timeline'

const now = new Date('2026-08-02T00:00:00.000Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)

describe('buildTimeline', () => {
  it('always opens with the application itself', () => {
    const [first] = buildTimeline(
      { stage: 'interview', appliedAt: daysAgo(10), stageChangedAt: daysAgo(3) },
      now
    )
    expect(first).toMatchObject({ kind: 'applied', at: daysAgo(10) })
  })

  it('adds the current stage as a second entry with its own clock', () => {
    const timeline = buildTimeline(
      { stage: 'interview', appliedAt: daysAgo(10), stageChangedAt: daysAgo(3) },
      now
    )
    expect(timeline).toHaveLength(2)
    expect(timeline[1]).toMatchObject({ kind: 'current', stage: 'interview', days: 3 })
  })

  it('collapses to a single entry while the applicant is still in applied', () => {
    // stageChangedAt equals appliedAt for a new applicant, and showing
    // "Applied" twice reads as a rendering bug rather than as history.
    const timeline = buildTimeline(
      { stage: 'applied', appliedAt: daysAgo(4), stageChangedAt: daysAgo(4) },
      now
    )
    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({ kind: 'applied', days: 4 })
  })

  it('keeps both entries for an applicant moved back to applied later', () => {
    const timeline = buildTimeline(
      { stage: 'applied', appliedAt: daysAgo(20), stageChangedAt: daysAgo(2) },
      now
    )
    expect(timeline).toHaveLength(2)
    expect(timeline[1]).toMatchObject({ kind: 'current', stage: 'applied', days: 2 })
  })

  it('marks hired and rejected as terminal so the UI can stop the timeline', () => {
    for (const stage of ['hired', 'rejected']) {
      const timeline = buildTimeline(
        { stage, appliedAt: daysAgo(30), stageChangedAt: daysAgo(1) },
        now
      )
      expect(timeline[timeline.length - 1]).toMatchObject({ terminal: true })
    }
  })

  it('does not mark an in-flight stage as terminal', () => {
    for (const stage of ['applied', 'interview', 'offer']) {
      const timeline = buildTimeline(
        { stage, appliedAt: daysAgo(30), stageChangedAt: daysAgo(1) },
        now
      )
      expect(timeline[timeline.length - 1]).toMatchObject({ terminal: false })
    }
  })

  it('flags an offer that has been outstanding too long', () => {
    const timeline = buildTimeline(
      { stage: 'offer', appliedAt: daysAgo(40), stageChangedAt: daysAgo(14) },
      now
    )
    expect(timeline[1]).toMatchObject({ aging: true })
  })

  it('does not flag a fresh offer, or any non-offer stage', () => {
    expect(
      buildTimeline({ stage: 'offer', appliedAt: daysAgo(40), stageChangedAt: daysAgo(2) }, now)[1]
    ).toMatchObject({ aging: false })
    expect(
      buildTimeline(
        { stage: 'interview', appliedAt: daysAgo(40), stageChangedAt: daysAgo(90) },
        now
      )[1]
    ).toMatchObject({ aging: false })
  })
})
