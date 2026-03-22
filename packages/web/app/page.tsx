import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export const metadata: Metadata = {
  title: 'use.dev — Universal installer for AI-native devs',
  description:
    "Install any MCP server, CLI, or SDK in one command. Copy any developer's setup instantly.",
}

// Revalidate every 60s (ISR)
export const revalidate = 60

interface UseJson {
  tools?: Record<string, unknown>
}

function parseUseJson(raw: Json): UseJson {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  return raw as UseJson
}

export default async function HomePage() {
  const supabase = createServiceClient()

  const [handlesResult, toolsResult] = await Promise.all([
    supabase
      .from('handles')
      .select('handle, display_name, avatar_url, copies_this_week, copies_total, use_json')
      .order('copies_this_week', { ascending: false })
      .limit(12),
    supabase
      .from('tools')
      .select('name, display_name, type, description, installs_this_week, installs_total')
      .order('installs_this_week', { ascending: false })
      .limit(10),
  ])

  const handles = handlesResult.data ?? []
  const tools = toolsResult.data ?? []

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">use</h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-xl mx-auto">
            Install any AI-native tool in one command.
            <br />
            Copy any developer&apos;s setup instantly.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <code className="font-mono text-sm text-emerald-400 bg-zinc-900 rounded-lg px-5 py-3 border border-zinc-800">
              npx stack install stripe
            </code>
            <code className="font-mono text-sm text-violet-400 bg-zinc-900 rounded-lg px-5 py-3 border border-zinc-800">
              npx stack @orpheo
            </code>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Trending handles */}
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Trending setups this week
            </h2>
            {handles.length === 0 ? (
              <p className="text-zinc-600 text-sm">
                No setups yet. Be the first —{' '}
                <code className="font-mono text-xs">npx stack publish</code>
              </p>
            ) : (
              <div className="space-y-2">
                {handles.map((h) => {
                  const uj = parseUseJson(h.use_json)
                  const toolCount = Object.keys(uj.tools ?? {}).length
                  return (
                    <a
                      key={h.handle}
                      href={`/@${h.handle}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 hover:bg-zinc-800 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {h.avatar_url !== null && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={h.avatar_url}
                            alt={h.handle}
                            className="w-8 h-8 rounded-full border border-zinc-700 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-white transition-colors">
                            @{h.handle}
                          </p>
                          {h.display_name !== null && h.display_name !== h.handle && (
                            <p className="text-zinc-600 text-xs truncate">{h.display_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-semibold tabular-nums">
                          {h.copies_this_week.toLocaleString()}
                        </p>
                        <p className="text-zinc-600 text-xs">{toolCount} tools</p>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </section>

          {/* Trending tools */}
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
              Popular tools
            </h2>
            {tools.length === 0 ? (
              <p className="text-zinc-600 text-sm">No tools yet.</p>
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
                        {t.installs_this_week.toLocaleString()}
                      </p>
                      <p className={`text-xs mt-0.5 ${TYPE_COLORS[t.type] ?? 'text-zinc-500'}`}>
                        {t.type}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

const TYPE_COLORS: Record<string, string> = {
  mcp: 'text-violet-400',
  sdk: 'text-blue-400',
  cli: 'text-emerald-400',
  api: 'text-amber-400',
  config: 'text-zinc-400',
}
