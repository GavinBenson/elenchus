export type SeedEmployee = {
  name: string
  department: string
  title: string
  /** ISO date string — hire dates are historical and never relative. */
  hireDate: string
  status?: 'active' | 'terminated'
  /** Natural-key reference to another employee in this list, or null for top of tree. */
  managerName: string | null
  /** Set only for employees backed by a fixture login. */
  userEmail?: string
}

export const employees: SeedEmployee[] = [
  {
    name: 'Morgan Manager',
    department: 'Engineering',
    title: 'Engineering Manager',
    hireDate: '2022-01-10',
    managerName: null,
    userEmail: 'manager@elenchus.test',
  },
  {
    name: 'Eli Employee',
    department: 'Engineering',
    title: 'Software Engineer',
    hireDate: '2023-03-01',
    managerName: 'Morgan Manager',
    userEmail: 'employee@elenchus.test',
  },
]
