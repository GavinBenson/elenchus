import { STAGES, sortForReview, type Stage } from './applicants-query'

/**
 * The board's client state. Deliberately a flat list rather than pre-grouped
 * columns: an optimistic move is then a single map over one array, and the
 * pre-move array is the rollback value with nothing else to reconstruct.
 * Columns are derived for render.
 */
export type BoardApplicant = {
  id: string
  name: string
  email: string
  stage: string
  stageChangedAt: Date
  jobPostingTitle: string
}

export function groupByStage<T extends BoardApplicant>(
  applicants: T[],
  now: Date
): Record<Stage, T[]> {
  const columns = Object.fromEntries(STAGES.map((stage) => [stage, [] as T[]])) as Record<
    Stage,
    T[]
  >

  for (const applicant of applicants) {
    // A stage the UI does not know about would otherwise throw here. The
    // column list is the contract; anything else is not displayable.
    const column = columns[applicant.stage as Stage]
    if (column) column.push(applicant)
  }

  for (const stage of STAGES) {
    columns[stage] = sortForReview(columns[stage], now)
  }

  return columns
}

/**
 * Returns a new list with one applicant moved. Never mutates: the caller keeps
 * the previous array as the rollback value for when the API rejects the move.
 */
export function applyStageMove<T extends BoardApplicant>(
  applicants: T[],
  id: string,
  toStage: Stage,
  now: Date
): T[] {
  const current = applicants.find((applicant) => applicant.id === id)
  // Dropping a card back on the column it came from must not reset the
  // days-in-stage clock — the same no-op defect that was fixed in the stage
  // API during PBI 6.1.
  if (!current || current.stage === toStage) return applicants

  return applicants.map((applicant) =>
    applicant.id === id ? { ...applicant, stage: toStage, stageChangedAt: now } : applicant
  )
}
