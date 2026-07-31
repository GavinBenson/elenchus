export type SeedPosting = {
  title: string
  department: string
  status: 'open' | 'closed'
  /** Natural-key reference to a seeded user. */
  createdByEmail: string
}

export const postings: SeedPosting[] = [
  {
    title: 'QA Engineer',
    department: 'Engineering',
    status: 'open',
    createdByEmail: 'recruiter@elenchus.test',
  },
]
