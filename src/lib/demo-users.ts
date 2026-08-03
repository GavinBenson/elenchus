/**
 * The seeded fixture accounts, offered as one-click sign-in on the login
 * screen so a reader landing on this demo cold can see all four role variants
 * without hunting for credentials.
 *
 * These credentials are already public in `prisma/seed.ts` — this exposes
 * nothing the repository does not. The list is deliberately a fixed constant
 * rather than anything derived from the database at runtime: it is a demo
 * shortcut for four known accounts, and it must never become a way to sign in
 * as an arbitrary user.
 */
export const DEMO_PASSWORD = 'password123'

export type DemoUser = {
  role: string
  email: string
  /** What this role can actually see, so the buttons double as an RBAC tour. */
  blurb: string
}

export const DEMO_USERS: DemoUser[] = [
  {
    role: 'admin',
    email: 'admin@elenchus.test',
    blurb: 'Everything, including roles and permissions',
  },
  {
    role: 'recruiter',
    email: 'recruiter@elenchus.test',
    blurb: 'Pipeline and postings, no employee roster',
  },
  {
    role: 'manager',
    email: 'manager@elenchus.test',
    blurb: 'Their team, plus the employee roster',
  },
  {
    role: 'employee',
    email: 'employee@elenchus.test',
    blurb: 'No permissions at all — the floor of the system',
  },
]
