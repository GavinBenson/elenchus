import { STAGES, type Stage } from './applicants-query'

export type DistributionSegment = {
  stage: Stage
  count: number
  percent: number
}

/**
 * Turns per-stage counts into bar segments. Kept separate from the component
 * because the rounding is the interesting part and is worth testing directly.
 */
export function stageDistribution(counts: Record<Stage, number>): DistributionSegment[] {
  const total = STAGES.reduce((sum, stage) => sum + counts[stage], 0)
  if (total === 0) return []

  // Stages with nobody in them are dropped rather than rendered as zero-width
  // segments, which would still draw their border and dirty the bar.
  const present = STAGES.filter((stage) => counts[stage] > 0)

  const segments = present.map((stage) => ({
    stage,
    count: counts[stage],
    percent: Math.round((counts[stage] / total) * 100),
  }))

  // Independent rounding does not sum to 100 — three equal parts give 33+33+33
  // and leave a visible gap at the end of the bar. The last segment absorbs
  // the difference, which is at most a percentage point or two.
  const rounded = segments.reduce((sum, segment) => sum + segment.percent, 0)
  const last = segments[segments.length - 1]
  last.percent += 100 - rounded

  return segments
}
