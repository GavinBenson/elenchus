import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'
import StageControl from './StageControl'

export default async function ApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession()

  const { id } = await params
  const applicant = await db.applicant.findUnique({ where: { id }, include: { jobPosting: true } })
  if (!applicant) notFound()

  return (
    <div className="p-8" data-testid="applicant-detail">
      <h1 className="text-2xl font-bold" data-testid="applicant-name">
        {applicant.name}
      </h1>
      <p data-testid="applicant-email">{applicant.email}</p>
      <p data-testid="applicant-stage">{applicant.stage}</p>
      <p data-testid="applicant-job-posting">{applicant.jobPosting.title}</p>
      <div className="mt-4">
        <StageControl applicantId={applicant.id} currentStage={applicant.stage} />
      </div>
    </div>
  )
}
