import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { resolveEffectivePermissions } from '@/lib/permissions'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) {
    return NextResponse.next()
  }

  const permissions = await resolveEffectivePermissions(session.userId)
  const headers = new Headers(request.headers)
  headers.set('x-user-id', session.userId)
  headers.set('x-user-permissions', Array.from(permissions).join(','))

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: '/api/:path*',
}
