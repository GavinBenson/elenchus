/**
 * Roster helpers. Kept out of the pages so the "what counts as terminated"
 * rule has one definition and the tenure arithmetic is testable without a
 * database.
 */

/**
 * Anything that is not explicitly `active` is treated as departed. The column
 * is a free string, and presenting an unclassifiable status as current staff
 * is the worse of the two failure modes.
 */
export function isTerminated(employee: { status: string }): boolean {
  return employee.status !== 'active'
}

// Locale-aware so `Grace O’Sullivan` (U+2019, a deliberate Unicode edge case
// in the seed) sorts beside straight-apostrophe names rather than after every
// ASCII letter, which is what a plain `<` comparison does.
const byName = new Intl.Collator('en', { sensitivity: 'base' })

export function sortRoster<T extends { name: string; status: string }>(employees: T[]): T[] {
  return [...employees].sort((a, b) => {
    const aGone = isTerminated(a)
    const bGone = isTerminated(b)
    if (aGone !== bGone) return aGone ? 1 : -1
    return byName.compare(a.name, b.name)
  })
}

const MS_PER_DAY = 86_400_000
const DAYS_PER_MONTH = 365.25 / 12

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'}`
}

/**
 * Human tenure, e.g. "3 months" or "2 years, 1 month". Approximate by design:
 * an exact calendar difference is not worth the complexity for a figure that
 * is read at a glance.
 */
export function tenureLabel(hireDate: Date, now: Date): string {
  const elapsedDays = (now.getTime() - hireDate.getTime()) / MS_PER_DAY
  if (elapsedDays < 0) return 'not started'

  const totalMonths = Math.floor(elapsedDays / DAYS_PER_MONTH)
  if (totalMonths < 1) return 'less than a month'

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (years === 0) return plural(months, 'month')
  if (months === 0) return plural(years, 'year')
  return `${plural(years, 'year')}, ${plural(months, 'month')}`
}
