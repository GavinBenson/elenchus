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
  { title: 'Senior QA Engineer', department: 'Engineering', status: 'open', createdByEmail: 'recruiter@elenchus.test' },
  { title: 'Platform Engineer', department: 'Engineering', status: 'open', createdByEmail: 'recruiter@elenchus.test' },
  { title: 'Product Designer', department: 'Design', status: 'open', createdByEmail: 'recruiter@elenchus.test' },
  { title: 'Data Analyst', department: 'Analytics', status: 'open', createdByEmail: 'manager@elenchus.test' },
  { title: 'Account Executive', department: 'Sales', status: 'open', createdByEmail: 'recruiter@elenchus.test' },
  { title: 'Engineering Manager, Payments', department: 'Engineering', status: 'closed', createdByEmail: 'admin@elenchus.test' },
]
