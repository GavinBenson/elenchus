import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'

export default async function ApplicantsPage() {
  await requireSession()

  const applicants = await db.applicant.findMany({ include: { jobPosting: true } })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Applicants</h1>
      <ul data-testid="applicants-list">
        {applicants.map((a) => (
          <li key={a.id} data-testid={`applicant-row-${a.id}`}>
            <a href={`/applicants/${a.id}`}>
              {a.name} — {a.stage} — {a.jobPosting.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
