/**
 * Memoised per seed run, not per process. `dayStart()` is called for every
 * date-bearing row (50+ times per seed); if it read the clock each time, a
 * run straddling midnight UTC would anchor some rows to one day and the rest
 * to the next, producing an internally inconsistent seed. Caching it for the
 * duration of a run guarantees that run is self-consistent.
 *
 * Caching it for the life of the process instead would be wrong: the app's
 * test-reset endpoint (`POST /api/test/reset`) calls `runSeed()` inside a
 * long-lived Next.js server process, potentially days after the process
 * started. A process-lifetime anchor would reseed using the day the server
 * booted rather than the day of the reset, silently breaking the seed's
 * "applied today" / "aging past 10 days" invariants. `resetDayAnchor()` must
 * therefore be called at the very start of every `runSeed()`, before any
 * date is computed, so each run re-reads the clock exactly once.
 */
let anchor: Date | undefined

/**
 * Clears the cached anchor so the next call to `dayStart()` re-reads the
 * clock. Must be called at the very start of every seed run (see comment
 * above `anchor`).
 */
export function resetDayAnchor(): void {
  anchor = undefined
}

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
