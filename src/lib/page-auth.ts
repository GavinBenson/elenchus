import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { resolveEffectivePermissions, hasPermission } from '@/lib/permissions'

/**
 * Resolves the logged-in user for a page, redirecting to /login if there is
 * no valid session. Replaces the cookie/verify/redirect preamble that was
 * copy-pasted into every page component.
 */
export async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  })
  // A token can outlive its user; treat that as unauthenticated.
  if (!user) redirect('/login')

  const permissions = await resolveEffectivePermissions(user.id)
  return { user, permissions }
}

/**
 * As requireSession, plus a permission gate. An unauthenticated caller still
 * goes to /login; an authenticated one lacking the permission goes to
 * /dashboard, which every role can see.
 */
export async function requirePermission(key: string) {
  const { user, permissions } = await requireSession()
  if (!hasPermission(permissions, key)) redirect('/dashboard')
  return { user, permissions }
}
