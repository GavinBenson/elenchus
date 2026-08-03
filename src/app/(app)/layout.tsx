import { requireSession } from '@/lib/page-auth'
import { navItemsFor } from '@/lib/nav'
import { AppSidebar } from '@/components/AppSidebar'

/**
 * The authenticated shell. Resolves the session once for every screen beneath
 * it, so pages no longer repeat the cookie/verify/redirect preamble. Route
 * groups do not affect URLs — /applicants is still /applicants.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, permissions } = await requireSession()

  return (
    <div className="flex min-h-screen bg-surface">
      <AppSidebar
        items={navItemsFor(permissions)}
        userEmail={user.email}
        roleName={user.role.name}
      />
      {/* pt-16 clears the fixed mobile top bar; at lg the bar is gone and the
          original padding applies. min-w-0 keeps a wide table inside its own
          scroll container instead of stretching this flex child. */}
      <main className="min-w-0 flex-1 px-4 pb-5 pt-16 sm:px-6 lg:pt-5">{children}</main>
    </div>
  )
}
