import Link from 'next/link'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/page-auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { PipelineBoard } from './PipelineBoard'
import type { BoardApplicant } from '@/lib/pipeline-board'

export default async function PipelineBoardPage() {
  await requireSession()

  const applicants = await db.applicant.findMany({
    include: { jobPosting: { select: { title: true } } },
  })

  // Flattened at the boundary: the client component owns this as optimistic
  // state, and a nested Prisma shape would make every optimistic update a
  // deep clone.
  const board: BoardApplicant[] = applicants.map((applicant) => ({
    id: applicant.id,
    name: applicant.name,
    email: applicant.email,
    stage: applicant.stage,
    stageChangedAt: applicant.stageChangedAt,
    jobPostingTitle: applicant.jobPosting.title,
  }))

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={`${board.length} candidates across five stages`}
        actions={
          <Link
            href="/applicants"
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink"
          >
            List view
          </Link>
        }
      />
      <PipelineBoard initialApplicants={board} />
    </div>
  )
}
