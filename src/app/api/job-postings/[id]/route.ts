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

const UpdateJobPostingSchema = z.object({
  title: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  status: z.enum(['open', 'closed']).optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    const { id } = await params
    const posting = await db.jobPosting.findUnique({ where: { id }, include: { applicants: true } })
    if (!posting) return errorResponse(new ApiError(404, 'not_found', 'Job posting not found'))
    return Response.json(posting)
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_job_postings')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_job_postings permission'))
    }
    const { id } = await params
    const existing = await db.jobPosting.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Job posting not found'))
    const body = parseOrThrow(UpdateJobPostingSchema, await request.json())
    const posting = await db.jobPosting.update({ where: { id }, data: body })
    return Response.json(posting)
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_job_postings')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_job_postings permission'))
    }
    const { id } = await params
    const existing = await db.jobPosting.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Job posting not found'))
    await db.jobPosting.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return toErrorResponse(e)
  }
}
