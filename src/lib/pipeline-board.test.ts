import { describe, it, expect } from 'vitest'
import { STAGES } from './applicants-query'
import { applyStageMove, groupByStage, type BoardApplicant } from './pipeline-board'

const now = new Date('2026-08-02T00:00:00.000Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)

function applicant(overrides: Partial<BoardApplicant> & { id: string }): BoardApplicant {
  return {
    name: 'Someone',
    email: 'someone@example.com',
    stage: 'applied',
    stageChangedAt: daysAgo(1),
    jobPostingTitle: 'Platform Engineer',
    ...overrides,
  }
}

describe('groupByStage', () => {
  it('returns a column for every stage, even the empty ones', () => {
    expect(Object.keys(groupByStage([], now))).toEqual([...STAGES])
    for (const stage of STAGES) {
      expect(groupByStage([], now)[stage]).toEqual([])
    }
  })

  it('files each applicant under its own stage', () => {
    const grouped = groupByStage(
      [
        applicant({ id: 'a', stage: 'applied' }),
        applicant({ id: 'b', stage: 'offer' }),
        applicant({ id: 'c', stage: 'offer' }),
      ],
      now
    )
    expect(grouped.applied.map((a) => a.id)).toEqual(['a'])
    expect(grouped.offer.map((a) => a.id)).toEqual(['b', 'c'])
    expect(grouped.hired).toEqual([])
  })

  it('orders each column so aging offers surface first', () => {
    const grouped = groupByStage(
      [
        applicant({ id: 'fresh', stage: 'offer', stageChangedAt: daysAgo(1) }),
        applicant({ id: 'aging', stage: 'offer', stageChangedAt: daysAgo(20) }),
      ],
      now
    )
    expect(grouped.offer.map((a) => a.id)).toEqual(['aging', 'fresh'])
  })
})

describe('applyStageMove', () => {
  const list = [
    applicant({ id: 'a', stage: 'applied', stageChangedAt: daysAgo(5) }),
    applicant({ id: 'b', stage: 'interview', stageChangedAt: daysAgo(3) }),
  ]

  it('moves the named applicant to the target stage', () => {
    const moved = applyStageMove(list, 'a', 'interview', now)
    expect(moved.find((a) => a.id === 'a')!.stage).toBe('interview')
  })

  it('resets the moved applicant days-in-stage clock', () => {
    const moved = applyStageMove(list, 'a', 'interview', now)
    expect(moved.find((a) => a.id === 'a')!.stageChangedAt).toEqual(now)
  })

  it('leaves every other applicant untouched', () => {
    const moved = applyStageMove(list, 'a', 'interview', now)
    expect(moved.find((a) => a.id === 'b')).toEqual(list[1])
  })

  it('does not mutate the list it is given, so the pre-move state survives for rollback', () => {
    const before = structuredClone(list)
    applyStageMove(list, 'a', 'interview', now)
    expect(list).toEqual(before)
  })

  it('is a no-op when the applicant is dropped back on its current stage', () => {
    // Re-selecting the current stage must not zero days-in-stage — the same
    // defect that was fixed in the stage API during PBI 6.1.
    const moved = applyStageMove(list, 'a', 'applied', now)
    expect(moved).toEqual(list)
  })

  it('is a no-op for an unknown applicant id', () => {
    expect(applyStageMove(list, 'nope', 'offer', now)).toEqual(list)
  })
})
