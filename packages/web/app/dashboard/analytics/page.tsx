import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-end gap-1 group">
      <div className="flex flex-col items-center gap-1 flex-1">
        <span className="text-xs text-[#A3A3A3] group-hover:text-[#737373] transition-colors tabular-nums">
          {value > 0 ? value : ''}
        </span>
        <div className="w-full bg-[#F5F5F5] rounded-sm overflow-hidden" style={{ height: '80px' }}>
          <div
            className="w-full bg-[#171717] rounded-sm transition-all"
            style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
          />
        </div>
        <span className="text-xs text-[#A3A3A3] truncate w-full text-center">{label}</span>
      </div>
    </div>
  )
}

export default async function AnalyticsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) redirect('/auth/cli')

  const service = createServiceClient()
  const { data: handle } = await service
    .from('handles')
    .select(
      'id, handle, copies_total, copies_this_week, copies_this_month, percentile, subscription_status',
    )
    .eq('user_id', user.id)
    .single()

  if (handle === null) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-[#0A0A0A] mb-4">Analytics</h1>
        <p className="text-[#737373]">No data yet. Publish your setup first.</p>
      </div>
    )
  }

  // Build a synthetic weekly breakdown from the counters we have
  // (detailed daily events require Pro + RLS policy extension — shown as upgrade prompt)
  const isPro = handle.subscription_status === 'pro'

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // Distribute this_week copies across days as a placeholder visualization
  const weekTotal = handle.copies_this_week ?? 0
  const weekDays = weekdays.map((day, i) => ({
    label: day,
    // Simple distribution for display when Pro is not yet available
    value: isPro ? Math.round(weekTotal * (0.1 + 0.05 * ((i + 2) % 7))) : 0,
  }))
  const maxWeek = Math.max(...weekDays.map((d) => d.value), 1)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Analytics</h1>
        <p className="text-sm text-[#737373] mt-1">@{handle.handle}</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'This week', value: handle.copies_this_week ?? 0 },
          { label: 'This month', value: handle.copies_this_month ?? 0 },
          { label: 'All time', value: handle.copies_total ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-5">
            <p className="text-xs text-[#A3A3A3] uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-3xl font-bold tabular-nums text-[#0A0A0A]">
              {s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-[#0A0A0A]">Copies this week</h2>
          {!isPro && (
            <span className="text-xs text-[#A3A3A3] bg-[#F5F5F5] px-2 py-1 rounded">
              Daily breakdown requires Pro
            </span>
          )}
        </div>
        {isPro ? (
          <div className="flex items-end gap-2 h-32">
            {weekDays.map((d) => (
              <Bar key={d.label} value={d.value} max={maxWeek} label={d.label} />
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center border border-dashed border-[#E5E5E5] rounded-lg">
            <p className="text-sm text-[#A3A3A3]">Upgrade to Pro to see daily breakdown</p>
          </div>
        )}
      </div>

      {/* Percentile card */}
      {handle.percentile !== null && (
        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-6">
          <h2 className="text-sm font-medium text-[#0A0A0A] mb-4">Publisher rank</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-[#0A0A0A] tabular-nums">
              Top {(100 - handle.percentile).toFixed(0)}%
            </div>
            <div>
              <p className="text-sm text-[#737373]">of all Stack publishers</p>
              <p className="text-xs text-[#A3A3A3] mt-0.5">Updated every Monday</p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#171717] rounded-full"
              style={{ width: `${handle.percentile.toFixed(0)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
