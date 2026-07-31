/**
 * Midnight UTC of the current day. Anchoring to the start of the day rather
 * than to `now()` is what makes the seed deterministic across runs: two runs
 * on the same calendar day produce identical timestamps.
 */
export function dayStart(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
}

/** A date `days` before midnight UTC today. */
export function daysAgo(days: number): Date {
  const d = dayStart()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}
