import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'

export default async function JobPostingsPage() {
  await requireSession()

  const postings = await db.jobPosting.findMany()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Job Postings</h1>
      <ul data-testid="job-postings-list">
        {postings.map((p) => (
          <li key={p.id} data-testid={`posting-row-${p.id}`}>
            <a href={`/job-postings/${p.id}`}>{p.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
