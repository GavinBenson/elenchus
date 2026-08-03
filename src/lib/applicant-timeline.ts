import { daysInStage, isAgingOffer, type Stage } from './applicants-query'

/**
 * The applicant record stores two timestamps — `appliedAt` and
 * `stageChangedAt` — and no per-transition history, so this timeline is
 * honestly two points: when they applied, and when they entered the stage they
 * are in now. It deliberately does not invent the stages in between, because
 * the data does not record which path was taken or when.
 *
 * A real history would need a `StageEvent` table written on every transition.
 * That is a data-model change rather than a screen change, so it is not part
 * of this PBI.
 */
export type TimelineEntry =
  | { kind: 'applied'; at: Date; days: number; terminal: boolean }
  | { kind: 'current'; stage: string; at: Date; days: number; terminal: boolean; aging: boolean }

const TERMINAL_STAGES = new Set<string>(['hired', 'rejected'])

export function buildTimeline(
  applicant: { stage: string; appliedAt: Date; stageChangedAt: Date },
  now: Date
): TimelineEntry[] {
  const stillInApplied =
    applicant.stage === 'applied' &&
    applicant.stageChangedAt.getTime() === applicant.appliedAt.getTime()

  const applied: TimelineEntry = {
    kind: 'applied',
    at: applicant.appliedAt,
    days: daysInStage(applicant.appliedAt, now),
    // A brand new applicant's only entry is still open, never terminal.
    terminal: false,
  }

  // For a new applicant the two timestamps are the same value, and rendering
  // "Applied" twice reads as a rendering bug rather than as history.
  if (stillInApplied) return [applied]

  return [
    applied,
    {
      kind: 'current',
      stage: applicant.stage,
      at: applicant.stageChangedAt,
      days: daysInStage(applicant.stageChangedAt, now),
      terminal: TERMINAL_STAGES.has(applicant.stage),
      aging: isAgingOffer(applicant, now),
    },
  ]
}

export function isTerminalStage(stage: string): stage is Stage {
  return TERMINAL_STAGES.has(stage)
}
