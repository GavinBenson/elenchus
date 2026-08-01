import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'

const STAGES = ['applied', 'interview', 'offer', 'hired', 'rejected'] as const

export default async function JobPostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession()

  const { id } = await params
  const posting = await db.jobPosting.findUnique({ where: { id }, include: { applicants: true } })
  if (!posting) notFound()

  return (
    <div className="p-8" data-testid="job-posting-detail">
      <h1 className="text-2xl font-bold">{posting.title}</h1>
      <div className="flex gap-4 mt-4" data-testid="applicant-pipeline">
        {STAGES.map((stage) => (
          <div key={stage} data-testid={`pipeline-column-${stage}`} className="border p-2 flex-1">
            <h2 className="font-semibold">{stage}</h2>
            {posting.applicants
              .filter((a) => a.stage === stage)
              .map((a) => (
                <div key={a.id} data-testid={`applicant-card-${a.id}`}>
                  <a href={`/applicants/${a.id}`}>{a.name}</a>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
