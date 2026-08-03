import { describe, it, expect } from 'vitest'
import { STAGES } from './applicants-query'
import { activeCount, countsByStage } from './posting-pipeline'

const of = (...stages: string[]) => stages.map((stage) => ({ stage }))

describe('countsByStage', () => {
  it('reports zero for every stage when there are no applicants', () => {
    const counts = countsByStage([])
    expect(Object.keys(counts)).toEqual([...STAGES])
    expect(Object.values(counts).every((n) => n === 0)).toBe(true)
  })

  it('counts each stage independently', () => {
    expect(countsByStage(of('applied', 'applied', 'offer', 'hired'))).toEqual({
      applied: 2,
      interview: 0,
      offer: 1,
      hired: 1,
      rejected: 0,
    })
  })

  it('ignores a stage value the UI does not know about rather than throwing', () => {
    // The column is a free string in the schema, so a bad value must not take
    // the whole page down.
    expect(countsByStage(of('applied', 'archived')).applied).toBe(1)
  })
})

describe('activeCount', () => {
  it('counts only candidates still in play', () => {
    // Hired and rejected are terminal: including them would make a long-closed
    // posting look busy.
    expect(activeCount(of('applied', 'interview', 'offer', 'hired', 'rejected'))).toBe(3)
  })

  it('is zero when every candidate has reached a terminal stage', () => {
    expect(activeCount(of('hired', 'rejected', 'rejected'))).toBe(0)
  })

  it('is zero for no applicants at all', () => {
    expect(activeCount([])).toBe(0)
  })
})
