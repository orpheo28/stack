import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Trending AI Tools — getstack.com',
  description:
    'Discover the most popular MCP servers, CLIs, and SDKs for AI-native development this week.',
  openGraph: {
    title: 'Trending AI Tools — getstack.com',
    description:
      'Discover the most popular MCP servers, CLIs, and SDKs for AI-native development this week.',
    siteName: 'getstack.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trending AI Tools — getstack.com',
    description:
      'Discover the most popular MCP servers, CLIs, and SDKs for AI-native development this week.',
  },
}

export const revalidate = 60

const TYPE_DOT: Record<string, string> = {
  mcp: 'bg-violet-500',
  sdk: 'bg-blue-500',
  cli: 'bg-emerald-500',
  api: 'bg-amber-500',
  config: 'bg-gray-400',
}

const TYPE_FILTERS = ['all', 'mcp', 'cli', 'sdk', 'api'] as const

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}): Promise<React.JSX.Element> {
  const params = await searchParams
  const activeType = TYPE_FILTERS.includes(params.type as (typeof TYPE_FILTERS)[number])
    ? (params.type as (typeof TYPE_FILTERS)[number])
    : 'all'

  const supabase = createServiceClient()

  let query = supabase
    .from('tools')
    .select(
      'name, display_name, type, description, source, installs_this_week, installs_total, score',
    )
    .order('installs_this_week', { ascending: false })
    .limit(50)

  if (activeType !== 'all') {
    query = query.eq('type', activeType)
  }

  const { data: tools } = await query
  const items = tools ?? []

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-20">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-xs text-[#A3A3A3] hover:text-[#171717] transition-colors">
            ← Home
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A] mt-4">
            Trending tools
          </h1>
          <p className="text-sm text-[#737373] mt-2">Most installed AI-native tools this week</p>
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-2 mb-8">
          {TYPE_FILTERS.map((type) => (
            <Link
              key={type}
              href={type === 'all' ? '/trending' : `/trending?type=${type}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeType === type
                  ? 'border-[#171717] bg-[#171717] text-white'
                  : 'border-[#E5E5E5] text-[#737373] hover:border-[#D4D4D4]'
              }`}
            >
              {type === 'all' ? 'All' : type.toUpperCase()}
            </Link>
          ))}
        </div>

        {/* Tools list */}
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E5E5E5] px-6 py-10 text-center">
            <p className="text-sm text-[#A3A3A3]">No tools found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map((t, i) => (
              <Link
                key={t.name}
                href={`/install/${t.name}`}
                className="group flex items-center gap-4 rounded-lg px-4 py-3.5 -mx-4 transition-colors hover:bg-[#FAFAFA]"
              >
                <span className="text-xs text-[#A3A3A3] w-6 text-right font-mono tabular-nums">
                  {i + 1}
                </span>
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[t.type] ?? 'bg-gray-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{t.display_name}</p>
                    <span className="text-[10px] text-[#A3A3A3] uppercase tracking-wider shrink-0">
                      {t.type}
                    </span>
                  </div>
                  {t.description !== null && (
                    <p className="text-xs text-[#A3A3A3] truncate mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums font-mono text-[#0A0A0A]">
                    {t.installs_this_week.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-[#A3A3A3]">this week</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#E5E5E5] text-center">
          <p className="text-xs text-[#A3A3A3]">
            Install any tool:{' '}
            <code className="text-[#737373] font-mono">npx usedev install &lt;name&gt;</code>
          </p>
        </div>
      </div>
    </main>
  )
}
