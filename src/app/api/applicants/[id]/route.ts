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

const UpdateApplicantSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  resumeUrl: z.string().url().optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    const { id } = await params
    const applicant = await db.applicant.findUnique({ where: { id } })
    if (!applicant) return errorResponse(new ApiError(404, 'not_found', 'Applicant not found'))
    return Response.json(applicant)
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
    const existing = await db.applicant.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Applicant not found'))
    const body = parseOrThrow(UpdateApplicantSchema, await request.json())
    const applicant = await db.applicant.update({ where: { id }, data: body })
    return Response.json(applicant)
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'delete_applicant')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing delete_applicant permission'))
    }
    const { id } = await params
    const existing = await db.applicant.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Applicant not found'))
    await db.applicant.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return toErrorResponse(e)
  }
}
