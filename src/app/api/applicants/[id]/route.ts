import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  const { id } = await params
  const applicant = await db.applicant.findUnique({ where: { id } })
  if (!applicant) return errorResponse(new ApiError(404, 'not_found', 'Applicant not found'))
  return Response.json(applicant)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
}
