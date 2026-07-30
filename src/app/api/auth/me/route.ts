import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) {
    return errorResponse(new ApiError(401, 'unauthenticated', 'No valid session'))
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: { select: { name: true } } },
  })
  if (!user) {
    return errorResponse(new ApiError(401, 'unauthenticated', 'No valid session'))
  }

  return Response.json(user)
}
