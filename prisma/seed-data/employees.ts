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

  // ---- Leadership ----
  { name: 'Rosalind Achebe', department: 'Executive', title: 'Chief Executive Officer', hireDate: '2019-02-04', managerName: null },
  { name: 'Priyanka Venkatesan', department: 'Engineering', title: 'VP of Engineering', hireDate: '2019-06-17', managerName: 'Rosalind Achebe' },
  { name: 'Anders Lindqvist', department: 'Sales', title: 'VP of Sales', hireDate: '2020-01-13', managerName: 'Rosalind Achebe' },
  { name: 'Naomi Okonkwo', department: 'People', title: 'VP of People', hireDate: '2020-03-02', managerName: 'Rosalind Achebe' },
  { name: 'Gustavo Ferreira', department: 'Finance', title: 'VP of Finance', hireDate: '2020-08-24', managerName: 'Rosalind Achebe' },
  { name: 'Mateus Oliveira', department: 'Design', title: 'Design Manager', hireDate: '2021-04-12', managerName: 'Rosalind Achebe' },

  // ---- Middle management ----
  { name: 'Wei-Lin Chao', department: 'Engineering', title: 'Engineering Manager, Platform', hireDate: '2020-09-07', managerName: 'Priyanka Venkatesan' },
  { name: 'Ibrahim Al-Rashid', department: 'Engineering', title: 'Engineering Manager, Product', hireDate: '2021-01-25', managerName: 'Priyanka Venkatesan' },
  { name: 'Saoirse Gallagher', department: 'Engineering', title: 'QA Manager', hireDate: '2021-07-19', managerName: 'Priyanka Venkatesan' },
  { name: 'Farida Haddad', department: 'Analytics', title: 'Analytics Manager', hireDate: '2021-09-06', managerName: 'Gustavo Ferreira' },

  // ---- Platform engineering ----
  { name: 'Kenji Watanabe', department: 'Engineering', title: 'Senior Platform Engineer', hireDate: '2021-02-15', managerName: 'Wei-Lin Chao' },
  { name: 'Amara Nwosu', department: 'Engineering', title: 'Platform Engineer', hireDate: '2022-05-09', managerName: 'Wei-Lin Chao' },
  { name: 'Tomás Restrepo', department: 'Engineering', title: 'Platform Engineer', hireDate: '2023-01-16', managerName: 'Wei-Lin Chao' },
  { name: 'Ingrid Bauer', department: 'Engineering', title: 'Site Reliability Engineer', hireDate: '2022-11-14', managerName: 'Wei-Lin Chao' },
  { name: 'Hyun-woo Park', department: 'Engineering', title: 'Site Reliability Engineer', hireDate: '2024-02-05', managerName: 'Wei-Lin Chao' },

  // ---- Product engineering ----
  { name: 'Leilani Kahale', department: 'Engineering', title: 'Senior Software Engineer', hireDate: '2021-06-01', managerName: 'Ibrahim Al-Rashid' },
  { name: 'Dmitri Volkov', department: 'Engineering', title: 'Software Engineer', hireDate: '2022-02-21', status: 'terminated', managerName: 'Ibrahim Al-Rashid' },
  { name: 'Chiara Rossi', department: 'Engineering', title: 'Software Engineer', hireDate: '2023-04-03', managerName: 'Ibrahim Al-Rashid' },
  { name: 'Kwame Mensah', department: 'Engineering', title: 'Software Engineer', hireDate: '2023-10-30', managerName: 'Ibrahim Al-Rashid' },
  { name: 'Sanne de Vries', department: 'Engineering', title: 'Junior Software Engineer', hireDate: '2025-01-20', managerName: 'Ibrahim Al-Rashid' },

  // ---- Quality engineering ----
  { name: 'Rafael Mendoza', department: 'Engineering', title: 'Senior QA Engineer', hireDate: '2021-11-08', managerName: 'Saoirse Gallagher' },
  { name: 'Aisha Bakari', department: 'Engineering', title: 'QA Engineer', hireDate: '2022-08-15', managerName: 'Saoirse Gallagher' },
  { name: 'Yuki Tanaka', department: 'Engineering', title: 'QA Engineer', hireDate: '2023-06-12', managerName: 'Saoirse Gallagher' },
  { name: 'Oliver Kowalski', department: 'Engineering', title: 'QA Automation Engineer', hireDate: '2024-05-27', managerName: 'Saoirse Gallagher' },

  // ---- Design ----
  { name: 'Zara Malik', department: 'Design', title: 'Senior Product Designer', hireDate: '2021-08-23', managerName: 'Mateus Oliveira' },
  { name: 'Lucas Fontaine', department: 'Design', title: 'Product Designer', hireDate: '2023-02-13', managerName: 'Mateus Oliveira' },
  { name: 'Nadia Petrova', department: 'Design', title: 'UX Researcher', hireDate: '2024-09-16', managerName: 'Mateus Oliveira' },

  // ---- Analytics ----
  { name: 'Arjun Krishnan', department: 'Analytics', title: 'Senior Data Analyst', hireDate: '2022-01-31', managerName: 'Farida Haddad' },
  { name: 'Bianca Lombardi', department: 'Analytics', title: 'Data Analyst', hireDate: '2023-07-24', managerName: 'Farida Haddad' },
  { name: 'Sipho Ndlovu', department: 'Analytics', title: 'Data Engineer', hireDate: '2024-03-11', managerName: 'Farida Haddad' },

  // ---- Sales ----
  // Deliberate Unicode edge case: "O’Sullivan" uses U+2019 RIGHT SINGLE
  // QUOTATION MARK, not an ASCII apostrophe. Kept intentionally so future
  // name-search work has a non-ASCII name to exercise (a query typed with a
  // plain ' must still find her). Not an accidental smart quote — do not
  // "correct" it.
  { name: 'Grace O’Sullivan', department: 'Sales', title: 'Account Executive', hireDate: '2021-05-10', managerName: 'Anders Lindqvist' },
  { name: 'Hassan Farouk', department: 'Sales', title: 'Account Executive', hireDate: '2022-06-27', managerName: 'Anders Lindqvist' },
  { name: 'Elena Marchetti', department: 'Sales', title: 'Sales Development Representative', hireDate: '2023-09-18', managerName: 'Anders Lindqvist' },
  { name: 'Tobias Berg', department: 'Sales', title: 'Sales Development Representative', hireDate: '2024-01-08', status: 'terminated', managerName: 'Anders Lindqvist' },
  { name: 'Camila Duarte', department: 'Sales', title: 'Solutions Engineer', hireDate: '2022-10-03', managerName: 'Anders Lindqvist' },

  // ---- People ----
  { name: 'Ruth Feldman', department: 'People', title: 'Recruiter', hireDate: '2021-03-15', managerName: 'Naomi Okonkwo' },
  { name: 'Joon-ho Seo', department: 'People', title: 'Recruiter', hireDate: '2023-05-22', managerName: 'Naomi Okonkwo' },
  { name: 'Adaeze Obi', department: 'People', title: 'People Operations Specialist', hireDate: '2024-07-01', managerName: 'Naomi Okonkwo' },

  // ---- Finance ----
  { name: 'Marek Nowak', department: 'Finance', title: 'Financial Analyst', hireDate: '2022-04-18', managerName: 'Gustavo Ferreira' },
  { name: 'Sofia Herrera', department: 'Finance', title: 'Accountant', hireDate: '2023-11-06', managerName: 'Gustavo Ferreira' },
]
