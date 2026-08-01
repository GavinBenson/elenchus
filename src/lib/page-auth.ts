import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { resolveEffectivePermissions, hasPermission } from '@/lib/permissions'

// Deduplicated within a single request: the layout and each page both call
// requireSession(), which would otherwise re-run these two lookups. Only the
// lookups are cached, not requireSession itself, so the redirect() throw
// inside requireSession stays outside any cached function.
const getUserById = cache((userId: string) =>
  db.user.findUnique({
    where: { id: userId },
    include: { role: true },
  })
)

const getEffectivePermissions = cache((userId: string) =>
  resolveEffectivePermissions(userId)
)

/**
 * Resolves the logged-in user for a page, redirecting to /login if there is
 * no valid session. Replaces the cookie/verify/redirect preamble that was
 * copy-pasted into every page component.
 */
export async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

  const user = await getUserById(session.userId)
  // A token can outlive its user; treat that as unauthenticated.
  if (!user) redirect('/login')

  const permissions = await getEffectivePermissions(user.id)
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
