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

  if (handle === null) redirect('/onboarding')

  const isPro = handle.subscription_status === 'pro'

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  let weekDays: { label: string; value: number }[]

  if (isPro) {
    // Fetch real daily copy_events for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data: dailyData } = await service
      .from('copy_events')
      .select('created_at')
      .eq('handle_id', handle.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Group by weekday label (Mon…Sun) relative to today
    const countsByDay: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const label = weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? weekdays[0]!
      countsByDay[label] = countsByDay[label] ?? 0
    }
    for (const row of dailyData ?? []) {
      const d = new Date(row.created_at)
      const label = weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? weekdays[0]!
      countsByDay[label] = (countsByDay[label] ?? 0) + 1
    }
    weekDays = weekdays.map((day) => ({ label: day, value: countsByDay[day] ?? 0 }))
  } else {
    weekDays = weekdays.map((day) => ({ label: day, value: 0 }))
  }

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
          <div className="h-32 flex flex-col items-center justify-center gap-3 border border-dashed border-[#E5E5E5] rounded-lg px-4">
            <div className="text-center">
              <p className="text-sm font-medium text-[#0A0A0A]">
                {handle.copies_this_week ?? 0} copies this week
              </p>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                {handle.copies_this_month ?? 0} this month · {handle.copies_total ?? 0} all time
              </p>
            </div>
            <a
              href="/dashboard/upgrade"
              className="text-xs text-white bg-[#171717] hover:bg-[#0A0A0A] px-3 py-1.5 rounded-md transition-colors"
            >
              Upgrade to Pro for daily breakdown
            </a>
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
