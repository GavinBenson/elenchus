import { STAGES, type Stage } from './applicants-query'
import { isTerminalStage } from './applicant-timeline'

/**
 * Per-stage counts for a posting's pipeline. Kept out of the page so the
 * "which stages are terminal" rule lives in one place and can be tested
 * without a database.
 */
export function countsByStage(applicants: { stage: string }[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<Stage, number>

  for (const applicant of applicants) {
    // `stage` is a free string in the schema. An unrecognised value is skipped
    // rather than counted into a column that does not exist.
    if ((STAGES as readonly string[]).includes(applicant.stage)) {
      counts[applicant.stage as Stage] += 1
    }
  }

  return counts
}

/**
 * Candidates still in play. Hired and rejected are excluded: counting them
 * would make a posting that closed months ago look like it has an active
 * pipeline.
 */
export function activeCount(applicants: { stage: string }[]): number {
  return applicants.filter((applicant) => !isTerminalStage(applicant.stage)).length
}
