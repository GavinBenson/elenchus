import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const CreateApplicantSchema = z.object({
  jobPostingId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  resumeUrl: z.string().url().optional(),
})

export async function GET(request: Request) {
  const { userId } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  const applicants = await db.applicant.findMany()
  return Response.json(applicants)
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_job_postings')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_job_postings permission'))
    }
    const body = parseOrThrow(CreateApplicantSchema, await request.json())
    const applicant = await db.applicant.create({ data: body })
    return Response.json(applicant, { status: 201 })
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
