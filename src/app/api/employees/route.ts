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

const CreateEmployeeSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  title: z.string().min(1),
  hireDate: z.string().datetime().or(z.string().min(1)),
  managerId: z.string().optional(),
  userId: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) {
      return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    }
    if (!hasPermission(permissions, 'view_all_employees')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing view_all_employees permission'))
    }
    const employees = await db.employee.findMany()
    return Response.json(employees)
  } catch (e) {
    return toErrorResponse(e)
  }
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) {
      return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    }
    if (!hasPermission(permissions, 'edit_employees')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_employees permission'))
    }
    const body = parseOrThrow(CreateEmployeeSchema, await request.json())
    const employee = await db.employee.create({
      data: { ...body, hireDate: new Date(body.hireDate) },
    })
    return Response.json(employee, { status: 201 })
  } catch (e) {
    return toErrorResponse(e)
  }
}
