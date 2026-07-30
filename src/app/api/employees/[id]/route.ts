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

const UpdateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  status: z.enum(['active', 'terminated']).optional(),
  managerId: z.string().nullable().optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    const { id } = await params
    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) return errorResponse(new ApiError(404, 'not_found', 'Employee not found'))
    return Response.json(employee)
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_employees')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_employees permission'))
    }
    const { id } = await params
    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Employee not found'))
    const body = parseOrThrow(UpdateEmployeeSchema, await request.json())
    const employee = await db.employee.update({ where: { id }, data: body })
    return Response.json(employee)
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_employees')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_employees permission'))
    }
    const { id } = await params
    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Employee not found'))
    await db.employee.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return toErrorResponse(e)
  }
}
