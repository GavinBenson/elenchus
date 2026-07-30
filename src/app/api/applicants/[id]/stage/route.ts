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

const StageSchema = z.object({
  stage: z.enum(['applied', 'interview', 'offer', 'hired', 'rejected']),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'delete_applicant')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing delete_applicant permission'))
    }
    const { id } = await params
    const body = parseOrThrow(StageSchema, await request.json())
    const existing = await db.applicant.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Applicant not found'))
    const applicant = await db.applicant.update({ where: { id }, data: { stage: body.stage } })
    return Response.json(applicant)
  } catch (e) {
    return toErrorResponse(e)
  }
}
