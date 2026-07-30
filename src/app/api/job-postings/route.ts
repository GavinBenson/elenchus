import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse, toErrorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const CreateJobPostingSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
})

export async function GET(request: Request) {
  try {
    const { userId } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    const postings = await db.jobPosting.findMany({ include: { applicants: true } })
    return Response.json(postings)
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_job_postings')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_job_postings permission'))
    }
    const body = parseOrThrow(CreateJobPostingSchema, await request.json())
    const posting = await db.jobPosting.create({
      data: { ...body, createdById: userId },
    })
    return Response.json(posting, { status: 201 })
  } catch (e) {
    return toErrorResponse(e)
  }
}
