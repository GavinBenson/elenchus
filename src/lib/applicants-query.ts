/**
 * Filtering, searching, and stage-aging logic for the applicants list, kept
 * out of the page component so it is unit-testable without a database or a
 * rendered tree. The page builds a Prisma `where` from these, so an invalid
 * URL param must be neutralised here rather than reaching the query.
 */

export const STAGES = ['applied', 'interview', 'offer', 'hired', 'rejected'] as const
export type Stage = (typeof STAGES)[number]

export type ApplicantFilters = {
  query: string
  stage: Stage | null
  postingId: string | null
}

/** Offers sitting longer than this many days are visually flagged as aging. */
export const OFFER_AGING_DAYS = 10

const MS_PER_DAY = 86_400_000

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value)
}

export function parseApplicantFilters(params: SearchParams): ApplicantFilters {
  const stage = first(params.stage)
  const postingId = first(params.posting)

  return {
    query: first(params.q).trim(),
    // An unrecognised stage is dropped rather than passed through: it would
    // otherwise reach Prisma as an arbitrary string and silently return an
    // empty list, which reads as a bug rather than as a rejected filter.
    stage: isStage(stage) ? stage : null,
    postingId: postingId || null,
  }
}

type Contains = { contains: string; mode: 'insensitive' }

export type ApplicantWhere = {
  stage?: Stage
  jobPostingId?: string
  OR?: ({ name: Contains } | { email: Contains })[]
}

const STRAIGHT_APOSTROPHE = "'"
const CURLY_APOSTROPHE = '’'

/**
 * Names in the data use a typographic apostrophe (`Grace O’Sullivan`), and a
 * recruiter's keyboard produces a straight one. Search both spellings so
 * either input finds the record.
 */
function apostropheVariants(query: string): string[] {
  const variants = new Set([query])
  if (query.includes(STRAIGHT_APOSTROPHE)) {
    variants.add(query.replaceAll(STRAIGHT_APOSTROPHE, CURLY_APOSTROPHE))
  }
  if (query.includes(CURLY_APOSTROPHE)) {
    variants.add(query.replaceAll(CURLY_APOSTROPHE, STRAIGHT_APOSTROPHE))
  }
  return [...variants]
}

export function applicantWhere(filters: ApplicantFilters): ApplicantWhere {
  const where: ApplicantWhere = {}

  if (filters.stage) where.stage = filters.stage
  if (filters.postingId) where.jobPostingId = filters.postingId

  if (filters.query) {
    where.OR = apostropheVariants(filters.query).flatMap((needle) => [
      { name: { contains: needle, mode: 'insensitive' as const } },
      { email: { contains: needle, mode: 'insensitive' as const } },
    ])
  }

  return where
}

/**
 * Whole days elapsed since the applicant entered their current stage. Counts
 * elapsed time rather than calendar boundaries crossed, so a move made
 * yesterday evening does not read as a full day old this morning.
 */
export function daysInStage(stageChangedAt: Date, now: Date): number {
  const elapsed = now.getTime() - stageChangedAt.getTime()
  if (elapsed <= 0) return 0
  return Math.floor(elapsed / MS_PER_DAY)
}

export function isAgingOffer(
  applicant: { stage: string; stageChangedAt: Date },
  now: Date
): boolean {
  if (applicant.stage !== 'offer') return false
  return daysInStage(applicant.stageChangedAt, now) > OFFER_AGING_DAYS
}

/**
 * Review order: aging offers first — they are the only rows carrying an
 * implicit deadline — then everything else by most recent activity.
 *
 * Sorting purely by oldest-first instead buries them under long-settled hired
 * and rejected rows, which is the opposite of useful. Done in memory rather
 * than in SQL because "aging" is a function of the request's clock, not a
 * stored column.
 */
export function sortForReview<T extends { stage: string; stageChangedAt: Date; name: string }>(
  applicants: T[],
  now: Date
): T[] {
  return [...applicants].sort((a, b) => {
    const aAging = isAgingOffer(a, now)
    const bAging = isAgingOffer(b, now)
    if (aAging !== bAging) return aAging ? -1 : 1
    // Within the aging group, the longest-outstanding offer is the most
    // urgent; everywhere else, the most recent activity is the most relevant.
    if (aAging) return a.stageChangedAt.getTime() - b.stageChangedAt.getTime()
    const byRecency = b.stageChangedAt.getTime() - a.stageChangedAt.getTime()
    return byRecency !== 0 ? byRecency : a.name.localeCompare(b.name)
  })
}
