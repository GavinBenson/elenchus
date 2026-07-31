export type SeedPosting = {
  title: string
  department: string
  status: 'open' | 'closed'
  /** Natural-key reference to a seeded user. */
  createdByEmail: string
  /**
   * Days before midnight UTC today that this posting was created. Converted
   * via `daysAgo()` so the seed stays deterministic within a calendar day,
   * the same pattern applicants use for `appliedDaysAgo`. Chosen comfortably
   * larger than the largest `appliedDaysAgo` of any applicant referencing
   * this posting, so the posting always predates its applicants.
   */
  createdDaysAgo: number
}

export const postings: SeedPosting[] = [
  {
    title: 'QA Engineer',
    department: 'Engineering',
    status: 'open',
    createdByEmail: 'recruiter@elenchus.test',
    createdDaysAgo: 10,
  },
  { title: 'Senior QA Engineer', department: 'Engineering', status: 'open', createdByEmail: 'recruiter@elenchus.test', createdDaysAgo: 60 },
  { title: 'Platform Engineer', department: 'Engineering', status: 'open', createdByEmail: 'recruiter@elenchus.test', createdDaysAgo: 75 },
  { title: 'Product Designer', department: 'Design', status: 'open', createdByEmail: 'recruiter@elenchus.test', createdDaysAgo: 55 },
  { title: 'Data Analyst', department: 'Analytics', status: 'open', createdByEmail: 'manager@elenchus.test', createdDaysAgo: 65 },
  { title: 'Account Executive', department: 'Sales', status: 'open', createdByEmail: 'recruiter@elenchus.test', createdDaysAgo: 80 },
  { title: 'Engineering Manager, Payments', department: 'Engineering', status: 'closed', createdByEmail: 'admin@elenchus.test', createdDaysAgo: 100 },
]
