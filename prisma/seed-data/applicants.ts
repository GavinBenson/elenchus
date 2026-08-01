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

  // ---- Applied (13) — never moved, so stageChangedDaysAgo === appliedDaysAgo ----
  { name: 'Priya Raghunathan', email: 'priya.raghunathan@example.com', postingTitle: 'Senior QA Engineer', stage: 'applied', appliedDaysAgo: 2, stageChangedDaysAgo: 2 },
  { name: 'Liam Okafor', email: 'liam.okafor@example.com', postingTitle: 'Data Analyst', stage: 'applied', appliedDaysAgo: 1, stageChangedDaysAgo: 1 },
  { name: 'Hana Sato', email: 'hana.sato@example.com', postingTitle: 'Platform Engineer', stage: 'applied', appliedDaysAgo: 5, stageChangedDaysAgo: 5 },
  { name: 'Ronan Byrne', email: 'ronan.byrne@example.com', postingTitle: 'Senior QA Engineer', stage: 'applied', appliedDaysAgo: 3, stageChangedDaysAgo: 3 },
  { name: 'Ingrid Solberg', email: 'ingrid.solberg@example.com', postingTitle: 'Product Designer', stage: 'applied', appliedDaysAgo: 6, stageChangedDaysAgo: 6 },
  { name: 'Diego Salazar', email: 'diego.salazar@example.com', postingTitle: 'Account Executive', stage: 'applied', appliedDaysAgo: 4, stageChangedDaysAgo: 4 },
  { name: 'Fatima Zahra', email: 'fatima.zahra@example.com', postingTitle: 'Platform Engineer', stage: 'applied', appliedDaysAgo: 8, stageChangedDaysAgo: 8 },
  { name: 'Nikolai Sorokin', email: 'nikolai.sorokin@example.com', postingTitle: 'Data Analyst', stage: 'applied', appliedDaysAgo: 2, stageChangedDaysAgo: 2 },
  { name: 'Aroha Ngata', email: 'aroha.ngata@example.com', postingTitle: 'Product Designer', stage: 'applied', appliedDaysAgo: 9, stageChangedDaysAgo: 9 },
  { name: 'Emeka Chukwu', email: 'emeka.chukwu@example.com', postingTitle: 'Senior QA Engineer', stage: 'applied', appliedDaysAgo: 1, stageChangedDaysAgo: 1 },
  { name: 'Lotte Jansen', email: 'lotte.jansen@example.com', postingTitle: 'Account Executive', stage: 'applied', appliedDaysAgo: 7, stageChangedDaysAgo: 7 },
  { name: 'Rashid Bin Talib', email: 'rashid.bintalib@example.com', postingTitle: 'Platform Engineer', stage: 'applied', appliedDaysAgo: 12, stageChangedDaysAgo: 12 },
  { name: 'Meera Pillai', email: 'meera.pillai@example.com', postingTitle: 'Data Analyst', stage: 'applied', appliedDaysAgo: 3, stageChangedDaysAgo: 3 },

  // ---- Interview (12) ----
  { name: 'Dana Whitfield', email: 'dana.whitfield@example.com', postingTitle: 'Senior QA Engineer', stage: 'interview', appliedDaysAgo: 19, stageChangedDaysAgo: 4 },
  { name: 'Yusuf Demir', email: 'yusuf.demir@example.com', postingTitle: 'Platform Engineer', stage: 'interview', appliedDaysAgo: 22, stageChangedDaysAgo: 6 },
  { name: 'Clara Lindgren', email: 'clara.lindgren@example.com', postingTitle: 'Product Designer', stage: 'interview', appliedDaysAgo: 17, stageChangedDaysAgo: 3 },
  { name: 'Ade Bakare', email: 'ade.bakare@example.com', postingTitle: 'Account Executive', stage: 'interview', appliedDaysAgo: 25, stageChangedDaysAgo: 8 },
  { name: 'Ravi Deshpande', email: 'ravi.deshpande@example.com', postingTitle: 'Data Analyst', stage: 'interview', appliedDaysAgo: 15, stageChangedDaysAgo: 2 },
  { name: 'Astrid Nilsen', email: 'astrid.nilsen@example.com', postingTitle: 'Senior QA Engineer', stage: 'interview', appliedDaysAgo: 28, stageChangedDaysAgo: 9 },
  { name: 'Bruno Cardoso', email: 'bruno.cardoso@example.com', postingTitle: 'Platform Engineer', stage: 'interview', appliedDaysAgo: 20, stageChangedDaysAgo: 5 },
  { name: 'Selin Kaya', email: 'selin.kaya@example.com', postingTitle: 'Product Designer', stage: 'interview', appliedDaysAgo: 16, stageChangedDaysAgo: 7 },
  { name: 'Thabo Molefe', email: 'thabo.molefe@example.com', postingTitle: 'Account Executive', stage: 'interview', appliedDaysAgo: 31, stageChangedDaysAgo: 11 },
  { name: 'Junko Ishikawa', email: 'junko.ishikawa@example.com', postingTitle: 'Data Analyst', stage: 'interview', appliedDaysAgo: 14, stageChangedDaysAgo: 1 },
  { name: 'Pierre Lacroix', email: 'pierre.lacroix@example.com', postingTitle: 'Senior QA Engineer', stage: 'interview', appliedDaysAgo: 23, stageChangedDaysAgo: 6 },
  { name: 'Noor Al-Sayegh', email: 'noor.alsayegh@example.com', postingTitle: 'Platform Engineer', stage: 'interview', appliedDaysAgo: 18, stageChangedDaysAgo: 4 },

  // ---- Offer (5) — Marcus and Beatriz are the aging offers ----
  { name: 'Marcus Oyelaran', email: 'marcus.oyelaran@example.com', postingTitle: 'Platform Engineer', stage: 'offer', appliedDaysAgo: 33, stageChangedDaysAgo: 11 },
  { name: 'Beatriz Alencar', email: 'beatriz.alencar@example.com', postingTitle: 'Senior QA Engineer', stage: 'offer', appliedDaysAgo: 41, stageChangedDaysAgo: 14 },
  { name: 'Oskar Novák', email: 'oskar.novak@example.com', postingTitle: 'Product Designer', stage: 'offer', appliedDaysAgo: 27, stageChangedDaysAgo: 5 },
  { name: 'Amina Diallo', email: 'amina.diallo@example.com', postingTitle: 'Account Executive', stage: 'offer', appliedDaysAgo: 24, stageChangedDaysAgo: 3 },
  { name: 'Henrik Dahl', email: 'henrik.dahl@example.com', postingTitle: 'Data Analyst', stage: 'offer', appliedDaysAgo: 30, stageChangedDaysAgo: 8 },

  // ---- Hired (8) ----
  { name: 'Ana Beatriz Lima', email: 'ana.lima@example.com', postingTitle: 'Senior QA Engineer', stage: 'hired', appliedDaysAgo: 52, stageChangedDaysAgo: 2 },
  { name: 'Viktor Petrenko', email: 'viktor.petrenko@example.com', postingTitle: 'Platform Engineer', stage: 'hired', appliedDaysAgo: 61, stageChangedDaysAgo: 13 },
  { name: 'Leila Hosseini', email: 'leila.hosseini@example.com', postingTitle: 'Product Designer', stage: 'hired', appliedDaysAgo: 48, stageChangedDaysAgo: 7 },
  { name: 'Samuel Adeyemi', email: 'samuel.adeyemi@example.com', postingTitle: 'Account Executive', stage: 'hired', appliedDaysAgo: 70, stageChangedDaysAgo: 21 },
  { name: 'Mei-Ling Zhou', email: 'meiling.zhou@example.com', postingTitle: 'Data Analyst', stage: 'hired', appliedDaysAgo: 55, stageChangedDaysAgo: 9 },
  { name: 'Jonas Vestergaard', email: 'jonas.vestergaard@example.com', postingTitle: 'Engineering Manager, Payments', stage: 'hired', appliedDaysAgo: 88, stageChangedDaysAgo: 34 },
  { name: 'Rhiannon Price', email: 'rhiannon.price@example.com', postingTitle: 'Senior QA Engineer', stage: 'hired', appliedDaysAgo: 44, stageChangedDaysAgo: 4 },
  { name: 'Karim Bouazizi', email: 'karim.bouazizi@example.com', postingTitle: 'Platform Engineer', stage: 'hired', appliedDaysAgo: 66, stageChangedDaysAgo: 17 },

  // ---- Rejected (7) ----
  { name: 'Sofia Almeida', email: 'sofia.almeida@example.com', postingTitle: 'Product Designer', stage: 'rejected', appliedDaysAgo: 23, stageChangedDaysAgo: 3 },
  { name: 'Callum Fraser', email: 'callum.fraser@example.com', postingTitle: 'Senior QA Engineer', stage: 'rejected', appliedDaysAgo: 37, stageChangedDaysAgo: 12 },
  { name: 'Nour Haddad', email: 'nour.haddad@example.com', postingTitle: 'Data Analyst', stage: 'rejected', appliedDaysAgo: 29, stageChangedDaysAgo: 6 },
  { name: 'Pavel Dvořák', email: 'pavel.dvorak@example.com', postingTitle: 'Platform Engineer', stage: 'rejected', appliedDaysAgo: 45, stageChangedDaysAgo: 19 },
  { name: 'Isabella Moretti', email: 'isabella.moretti@example.com', postingTitle: 'Account Executive', stage: 'rejected', appliedDaysAgo: 32, stageChangedDaysAgo: 8 },
  { name: 'Kofi Asante', email: 'kofi.asante@example.com', postingTitle: 'Engineering Manager, Payments', stage: 'rejected', appliedDaysAgo: 79, stageChangedDaysAgo: 40 },
  { name: 'Wanjiru Kamau', email: 'wanjiru.kamau@example.com', postingTitle: 'Senior QA Engineer', stage: 'rejected', appliedDaysAgo: 26, stageChangedDaysAgo: 5 },
]
