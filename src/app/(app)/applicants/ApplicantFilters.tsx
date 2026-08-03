'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { STAGES, type ApplicantFilters } from '@/lib/applicants-query'

const SEARCH_DEBOUNCE_MS = 250

const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

export type PostingOption = { id: string; title: string }

/**
 * Filter state lives in the URL rather than in component state, so a filtered
 * view is shareable and the back button works. The server page reads the same
 * params, which means there is exactly one source of truth for what is shown.
 */
export function ApplicantFilters({
  filters,
  postings,
}: {
  filters: ApplicantFilters
  postings: PostingOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // The search box is uncontrolled by the URL while typing: round-tripping
  // every keystroke through the server would drop characters typed during the
  // navigation.
  const [query, setQuery] = useState(filters.query)

  function navigate(next: { query?: string; stage?: string; posting?: string }) {
    const params = new URLSearchParams()
    const q = next.query ?? query
    const stage = next.stage ?? filters.stage ?? ''
    const posting = next.posting ?? filters.postingId ?? ''

    if (q) params.set('q', q)
    if (stage) params.set('stage', stage)
    if (posting) params.set('posting', posting)

    const search = params.toString()
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false })
    })
  }

  // Debounced so typing a name is one query, not one per character.
  useEffect(() => {
    if (query === filters.query) return
    const timer = setTimeout(() => navigate({ query }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // `navigate` closes over the current filters; re-running on every filter
    // change would re-issue the search that produced them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters.query])

  return (
    <div
      className="flex flex-wrap items-center gap-2 pb-4"
      data-pending={isPending ? '' : undefined}
    >
      <Input
        type="search"
        data-testid="applicants-search"
        aria-label="Search applicants by name or email"
        placeholder="Search name or email…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full sm:w-64"
      />

      <Select
        data-testid="filter-stage"
        aria-label="Filter by stage"
        value={filters.stage ?? ''}
        onChange={(event) => navigate({ stage: event.target.value })}
      >
        <option value="">All stages</option>
        {STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {STAGE_LABELS[stage]}
          </option>
        ))}
      </Select>

      <Select
        data-testid="filter-role"
        aria-label="Filter by role"
        value={filters.postingId ?? ''}
        onChange={(event) => navigate({ posting: event.target.value })}
      >
        <option value="">All roles</option>
        {postings.map((posting) => (
          <option key={posting.id} value={posting.id}>
            {posting.title}
          </option>
        ))}
      </Select>
    </div>
  )
}
