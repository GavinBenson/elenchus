export type SeedApplicant = {
  name: string
  email: string
  /** Natural-key reference to a posting title. */
  postingTitle: string
  stage: 'applied' | 'interview' | 'offer' | 'hired' | 'rejected'
  appliedDaysAgo: number
  stageChangedDaysAgo: number
}

export const applicants: SeedApplicant[] = [
  {
    name: 'Alex Applicant',
    email: 'alex.applicant@example.com',
    postingTitle: 'QA Engineer',
    stage: 'applied',
    appliedDaysAgo: 0,
    stageChangedDaysAgo: 0,
  },
]
