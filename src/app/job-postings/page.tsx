import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

export default async function JobPostingsPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

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
