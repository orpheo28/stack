import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Search — getstack.com',
  description: 'Search MCP servers, CLIs, SDKs, and AI-native dev tools.',
}

const TYPE_COLORS: Record<string, string> = {
  mcp: 'text-violet-400',
  sdk: 'text-blue-400',
  cli: 'text-emerald-400',
  api: 'text-amber-400',
  config: 'text-zinc-400',
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <a
          href="/"
          className="text-zinc-600 hover:text-zinc-400 text-sm mb-8 inline-block transition-colors"
        >
          ← getstack.com
        </a>

        <h1 className="text-3xl font-bold mb-6">Search tools</h1>

        <form action="/search" method="GET" className="mb-8">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="stripe, supabase, gws…"
            autoFocus
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
          />
        </form>

        {query !== '' && (
          <p className="text-zinc-500 text-sm mb-4">
            {tools.length} result{tools.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>
        )}

        {tools.length === 0 ? (
          <p className="text-zinc-600 text-sm">
            {query !== '' ? 'No tools found.' : 'Type a query to search the registry.'}
          </p>
        ) : (
          <div className="space-y-2">
            {tools.map((t) => (
              <a
                key={t.name}
                href={`/install/${t.name}`}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 hover:bg-zinc-800 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm group-hover:text-white transition-colors">
                    {t.display_name}
                  </p>
                  {t.description !== null && (
                    <p className="text-zinc-600 text-xs truncate mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-semibold tabular-nums">
                    {t.installs_total.toLocaleString()}
                  </p>
                  <p className={`text-xs mt-0.5 ${TYPE_COLORS[t.type] ?? 'text-zinc-500'}`}>
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
