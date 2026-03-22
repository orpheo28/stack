import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Search — getstack.com',
  description: 'Search MCP servers, CLIs, SDKs, and AI-native dev tools.',
}

const TYPE_COLORS: Record<string, string> = {
  mcp: 'text-violet-600',
  sdk: 'text-blue-600',
  cli: 'text-emerald-600',
  api: 'text-amber-600',
  config: 'text-gray-500',
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

function sanitizeQuery(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 100)
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = sanitizeQuery(q?.trim() ?? '')

  const supabase = createServiceClient()

  let dbQuery = supabase
    .from('tools')
    .select('name, display_name, type, description, installs_total, installs_this_week')
    .order('installs_total', { ascending: false })
    .limit(30)

  if (query !== '') {
    dbQuery = dbQuery.or(
      `name.ilike.%${query}%,display_name.ilike.%${query}%,description.ilike.%${query}%`,
    )
  }

  const { data } = await dbQuery
  const tools = data ?? []

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <a
          href="/"
          className="text-[#A3A3A3] hover:text-[#171717] text-sm mb-8 inline-block transition-colors"
        >
          ← getstack.com
        </a>

        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A] mb-6">Search tools</h1>

        <form action="/search" method="GET" className="mb-8">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="stripe, supabase, gws…"
            autoFocus
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none transition-colors"
          />
        </form>

        {query !== '' && (
          <p className="text-[#737373] text-sm mb-4">
            {tools.length} result{tools.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>
        )}

        {tools.length === 0 ? (
          <p className="text-[#A3A3A3] text-sm">
            {query !== '' ? 'No tools found.' : 'Type a query to search the registry.'}
          </p>
        ) : (
          <div className="space-y-2">
            {tools.map((t) => (
              <a
                key={t.name}
                href={`/install/${t.name}`}
                className="flex items-center justify-between rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 hover:border-[#D4D4D4] transition-colors group"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[#0A0A0A]">{t.display_name}</p>
                  {t.description !== null && (
                    <p className="text-[#A3A3A3] text-xs truncate mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold tabular-nums font-mono text-[#0A0A0A]">
                    {t.installs_total.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-0.5 ${TYPE_COLORS[t.type] ?? 'text-gray-500'}`}>
                    {t.type}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
