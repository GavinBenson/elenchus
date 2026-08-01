/**
 * Memoised so the anchor is computed once per process rather than once per
 * call. `dayStart()` is called for every date-bearing row (50+ times per seed);
 * if it read the clock each time, a run straddling midnight UTC would anchor
 * some rows to one day and the rest to the next, producing an internally
 * inconsistent seed. Computing it once guarantees any single run is
 * self-consistent.
 */
let anchor: Date | undefined

/**
 * Midnight UTC of the current day. Anchoring to the start of the day rather
 * than to `now()` is what makes the seed deterministic across runs: two runs
 * on the same calendar day produce identical timestamps.
 */
export function dayStart(): Date {
  if (!anchor) {
    const now = new Date()
    anchor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
  }
  // Return a copy: callers (e.g. daysAgo) mutate the result.
  return new Date(anchor.getTime())
}

/** A date `days` before midnight UTC today. */
export function daysAgo(days: number): Date {
  const d = dayStart()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}
