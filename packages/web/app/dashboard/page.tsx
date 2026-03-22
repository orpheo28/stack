import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold text-zinc-100 tabular-nums">{value}</p>
      {sub !== undefined && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) redirect('/auth/cli')

  const service = createServiceClient()
  const { data: handle } = await service
    .from('handles')
    .select(
      'handle, display_name, copies_total, copies_this_week, copies_this_month, percentile, subscription_status',
    )
    .eq('user_id', user.id)
    .single()

  // Count tools in use_json
  const { data: handleFull } = await service
    .from('handles')
    .select('use_json')
    .eq('user_id', user.id)
    .single()

  const tools =
    handleFull?.use_json !== null && typeof handleFull?.use_json === 'object'
      ? Object.keys(
          ((handleFull.use_json as Record<string, unknown>)['tools'] as Record<string, unknown>) ??
            {},
        ).length
      : 0

  if (handle === null) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-4">Dashboard</h1>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center max-w-lg">
          <p className="text-zinc-400 mb-4">You haven&apos;t published a setup yet.</p>
          <p className="text-sm text-zinc-500 font-mono">
            Run <span className="text-zinc-200">stack publish</span> to create your profile.
          </p>
        </div>
      </div>
    )
  }

  const percentileLabel =
    handle.percentile !== null ? `Top ${(100 - handle.percentile).toFixed(0)}%` : '—'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">@{handle.handle}&apos;s dashboard</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total copies"
          value={(handle.copies_total ?? 0).toLocaleString()}
          sub="All time"
        />
        <StatCard
          label="This week"
          value={(handle.copies_this_week ?? 0).toLocaleString()}
          sub="Resets Monday"
        />
        <StatCard
          label="This month"
          value={(handle.copies_this_month ?? 0).toLocaleString()}
          sub="Resets 1st"
        />
        <StatCard label="Percentile" value={percentileLabel} sub="vs all publishers" />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Tools published" value={tools} sub="In your stack" />
        <StatCard
          label="Plan"
          value={handle.subscription_status === 'pro' ? 'Pro' : 'Free'}
          sub={handle.subscription_status === 'pro' ? 'Active subscription' : 'Upgrade for more'}
        />
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col justify-between">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Quick actions</p>
          <div className="space-y-2">
            <p className="text-xs font-mono text-zinc-400 bg-zinc-800 rounded px-2 py-1.5">
              stack publish
            </p>
            <p className="text-xs font-mono text-zinc-400 bg-zinc-800 rounded px-2 py-1.5">
              stack whoami
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
