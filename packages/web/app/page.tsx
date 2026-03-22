import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export const metadata: Metadata = {
  title: 'getstack.com — Universal installer for AI-native devs',
  description:
    "Install any MCP server, CLI, or SDK in one command. Copy any developer's setup instantly.",
  openGraph: {
    title: 'getstack.com — Universal installer for AI-native devs',
    description:
      "Install any MCP server, CLI, or SDK in one command. Copy any developer's setup instantly.",
    siteName: 'getstack.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'getstack.com — Universal installer for AI-native devs',
    description:
      "Install any MCP server, CLI, or SDK in one command. Copy any developer's setup instantly.",
  },
}

export const revalidate = 60

interface UseJson {
  tools?: Record<string, unknown>
}

function parseUseJson(raw: Json): UseJson {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  return raw as UseJson
}

const TYPE_DOT: Record<string, string> = {
  mcp: 'bg-violet-400',
  sdk: 'bg-blue-400',
  cli: 'bg-emerald-400',
  api: 'bg-amber-400',
  config: 'bg-zinc-400',
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
      .limit(12),
  ])

  const handles = handlesResult.data ?? []
  const tools = toolsResult.data ?? []

  return (
    <main className="min-h-screen">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsla(260,50%,15%,0.4),transparent)]" />

      <div className="mx-auto max-w-5xl px-6 py-20">
        {/* Hero */}
        <header className="text-center mb-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs text-zinc-400 mb-8 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            42 tools available
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
              use
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-lg mx-auto leading-relaxed mb-12">
            Install any AI-native tool in one command.
            <br />
            Copy any developer&apos;s setup instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <CommandBlock text="npx usedev install stripe" accent="emerald" />
            <CommandBlock text="npx usedev @orpheo" accent="violet" />
          </div>
        </header>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Trending handles */}
          <section>
            <SectionHeader title="Trending setups" subtitle="this week" />
            {handles.length === 0 ? (
              <EmptyState text="No setups yet. Be the first." command="npx usedev publish" />
            ) : (
              <div className="space-y-1">
                {handles.map((h, i) => {
                  const uj = parseUseJson(h.use_json)
                  const toolCount = Object.keys(uj.tools ?? {}).length
                  return (
                    <Link
                      key={h.handle}
                      href={`/@${h.handle}`}
                      className="group flex items-center gap-4 rounded-lg px-4 py-3 -mx-4 transition-colors hover:bg-zinc-900/70"
                    >
                      <span className="text-xs text-zinc-600 w-5 text-right font-mono tabular-nums">
                        {i + 1}
                      </span>
                      {h.avatar_url !== null ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={h.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full border border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate transition-colors">
                          @{h.handle}
                        </p>
                        {h.display_name !== null && h.display_name !== h.handle && (
                          <p className="text-xs text-zinc-600 truncate">{h.display_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums font-mono text-zinc-300">
                          {h.copies_this_week.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-zinc-600">{toolCount} tools</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Popular tools */}
          <section>
            <SectionHeader title="Popular tools" subtitle="installs" />
            {tools.length === 0 ? (
              <EmptyState text="No tools yet." />
            ) : (
              <div className="space-y-1">
                {tools.map((t, i) => (
                  <Link
                    key={t.name}
                    href={`/install/${t.name}`}
                    className="group flex items-center gap-4 rounded-lg px-4 py-3 -mx-4 transition-colors hover:bg-zinc-900/70"
                  >
                    <span className="text-xs text-zinc-600 w-5 text-right font-mono tabular-nums">
                      {i + 1}
                    </span>
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[t.type] ?? 'bg-zinc-500'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate transition-colors">
                        {t.display_name}
                      </p>
                      {t.description !== null && (
                        <p className="text-xs text-zinc-600 truncate">{t.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums font-mono text-zinc-300">
                        {t.installs_this_week.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-zinc-600">{t.type}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <p>getstack.com</p>
          <div className="flex items-center gap-6">
            <Link href="/trending" className="hover:text-zinc-400 transition-colors">
              Trending
            </Link>
            <Link href="/search" className="hover:text-zinc-400 transition-colors">
              Search
            </Link>
            <a
              href="https://github.com/orpheohellandsjo/stack"
              className="hover:text-zinc-400 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/usedev"
              className="hover:text-zinc-400 transition-colors"
            >
              npm
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}

function CommandBlock({ text, accent }: { text: string; accent: 'emerald' | 'violet' }) {
  const color = accent === 'emerald' ? 'text-emerald-400' : 'text-violet-400'
  return (
    <div className="group relative">
      <div className="font-mono text-sm rounded-lg border border-zinc-800 bg-zinc-950/80 px-5 py-3 backdrop-blur-sm">
        <span className="text-zinc-600 select-none">$ </span>
        <span className={color}>{text}</span>
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-4">
      <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
      <span className="text-xs text-zinc-600">{subtitle}</span>
    </div>
  )
}

function EmptyState({ text, command }: { text: string; command?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 px-6 py-10 text-center">
      <p className="text-sm text-zinc-600">{text}</p>
      {command !== undefined && (
        <code className="mt-2 inline-block font-mono text-xs text-zinc-500">{command}</code>
      )}
    </div>
  )
}
