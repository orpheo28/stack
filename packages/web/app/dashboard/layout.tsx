import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Stack',
}

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/analytics', label: 'Analytics' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/billing', label: 'Billing' },
] as const

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/auth/cli')
  }

  // Fetch handle for sidebar display — redirect to onboarding if not set up yet
  const service = createServiceClient()
  const { data: handle } = await service
    .from('handles')
    .select('handle, display_name, avatar_url, subscription_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (handle === null) {
    redirect('/onboarding')
  }

  const displayName = handle.display_name ?? handle.handle ?? user.email ?? 'You'
  const plan = (handle?.subscription_status as string | undefined) ?? 'free'

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#FAFAFA] border-r border-[#E5E5E5] flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-[#E5E5E5]">
          <Link href="/" className="text-sm font-semibold tracking-tight text-[#0A0A0A]">
            stack
          </Link>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-[#E5E5E5]">
          {handle?.avatar_url !== undefined && handle.avatar_url !== null ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={handle.avatar_url} alt={displayName} className="w-8 h-8 rounded-full mb-2" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#E5E5E5] mb-2 flex items-center justify-center text-xs font-bold text-[#737373]">
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <p className="text-sm font-medium text-[#0A0A0A] truncate">{displayName}</p>
          {handle !== null && <p className="text-xs text-[#737373] truncate">@{handle.handle}</p>}
          <span
            className={`inline-block mt-1.5 text-xs px-1.5 py-0.5 rounded font-medium ${
              plan === 'pro' ? 'bg-violet-500/10 text-violet-600' : 'bg-[#F5F5F5] text-[#737373]'
            }`}
          >
            {plan === 'pro' ? 'Pro' : 'Free'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-5 py-2.5 text-sm text-[#737373] hover:text-[#0A0A0A] hover:bg-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-5 border-t border-[#E5E5E5]">
          {handle !== null && (
            <Link
              href={`/@${handle.handle}`}
              className="text-xs text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors"
            >
              View public profile →
            </Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-white">{children}</main>
    </div>
  )
}
