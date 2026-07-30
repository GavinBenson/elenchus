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

const CreatePermissionSchema = z.object({ key: z.string().min(1) })

export async function GET(request: Request) {
  const { userId, permissions } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  if (!hasPermission(permissions, 'manage_roles')) {
    return errorResponse(new ApiError(403, 'forbidden', 'Missing manage_roles permission'))
  }
  return Response.json(await db.permission.findMany())
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'manage_roles')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing manage_roles permission'))
    }
    const body = parseOrThrow(CreatePermissionSchema, await request.json())
    const permission = await db.permission.create({ data: body })
    return Response.json(permission, { status: 201 })
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
