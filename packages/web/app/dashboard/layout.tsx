import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Stack',
}

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '⬡' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '◈' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
  { href: '/dashboard/billing', label: 'Billing', icon: '◇' },
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

  // Fetch handle for sidebar display
  const service = createServiceClient()
  const { data: handle } = await service
    .from('handles')
    .select('handle, display_name, avatar_url, subscription_status')
    .eq('user_id', user.id)
    .single()

  const displayName = handle?.display_name ?? handle?.handle ?? user.email ?? 'You'
  const plan = (handle?.subscription_status as string | undefined) ?? 'free'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-zinc-800 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-zinc-800">
          <Link href="/" className="text-sm font-bold tracking-tight text-zinc-100">
            stack
          </Link>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-zinc-800">
          {handle?.avatar_url !== undefined && handle.avatar_url !== null ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={handle.avatar_url} alt={displayName} className="w-8 h-8 rounded-full mb-2" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-700 mb-2 flex items-center justify-center text-xs font-bold">
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <p className="text-sm font-medium text-zinc-100 truncate">{displayName}</p>
          {handle !== null && <p className="text-xs text-zinc-500 truncate">@{handle.handle}</p>}
          <span
            className={`inline-block mt-1.5 text-xs px-1.5 py-0.5 rounded font-medium ${
              plan === 'pro' ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-400'
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
              className="flex items-center gap-3 px-5 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800">
          {handle !== null && (
            <Link
              href={`/@${handle.handle}`}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              View public profile →
            </Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
