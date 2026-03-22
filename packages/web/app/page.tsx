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
  mcp: 'bg-violet-500',
  sdk: 'bg-blue-500',
  cli: 'bg-emerald-500',
  api: 'bg-amber-500',
  config: 'bg-gray-400',
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
      <div className="mx-auto max-w-5xl px-6 py-20">
        {/* Hero */}
        <header className="text-center mb-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-1.5 text-xs text-[#737373] mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            42 tools available
          </div>

          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight mb-6 text-[#0A0A0A]">
            use
          </h1>

          <p className="text-[15px] text-[#737373] max-w-lg mx-auto leading-relaxed mb-12">
            Install any AI-native tool in one command.
            <br />
            Copy any developer&apos;s setup instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <CommandBlock text="npx usedev install stripe" />
            <CommandBlock text="npx usedev @orpheo" />
          </div>
        </header>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Trending handles */}
          <section className="lg:border-r lg:border-[#E5E5E5] lg:pr-16">
            <SectionHeader title="Trending setups" subtitle="this week" />
            {handles.length === 0 ? (
              <EmptyState text="No setups yet. Be the first." command="npx usedev publish" />
            ) : (
              <div className="space-y-0.5">
                {handles.map((h, i) => {
                  const uj = parseUseJson(h.use_json)
                  const toolCount = Object.keys(uj.tools ?? {}).length
                  return (
                    <Link
                      key={h.handle}
                      href={`/@${h.handle}`}
                      className="group flex items-center gap-4 rounded-lg px-4 py-3 -mx-4 transition-colors hover:bg-[#FAFAFA]"
                    >
                      <span className="text-xs text-[#A3A3A3] w-5 text-right font-mono tabular-nums">
                        {i + 1}
                      </span>
                      {h.avatar_url !== null ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={h.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full border border-[#E5E5E5] shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0A0A0A] truncate">@{h.handle}</p>
                        {h.display_name !== null && h.display_name !== h.handle && (
                          <p className="text-xs text-[#A3A3A3] truncate">{h.display_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums font-mono text-[#0A0A0A]">
                          {h.copies_this_week.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-[#A3A3A3]">{toolCount} tools</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Popular tools */}
          <section className="lg:pl-16 mt-12 lg:mt-0">
            <SectionHeader title="Popular tools" subtitle="installs" />
            {tools.length === 0 ? (
              <EmptyState text="No tools yet." />
            ) : (
              <div className="space-y-0.5">
                {tools.map((t, i) => (
                  <Link
                    key={t.name}
                    href={`/install/${t.name}`}
                    className="group flex items-center gap-4 rounded-lg px-4 py-3 -mx-4 transition-colors hover:bg-[#FAFAFA]"
                  >
                    <span className="text-xs text-[#A3A3A3] w-5 text-right font-mono tabular-nums">
                      {i + 1}
                    </span>
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[t.type] ?? 'bg-gray-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A0A0A] truncate">
                        {t.display_name}
                      </p>
                      {t.description !== null && (
                        <p className="text-xs text-[#A3A3A3] truncate">{t.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums font-mono text-[#0A0A0A]">
                        {t.installs_this_week.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-[#A3A3A3]">{t.type}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A3A3A3]">
          <p>getstack.com</p>
          <div className="flex items-center gap-6">
            <Link href="/trending" className="hover:text-[#171717] transition-colors">
              Trending
            </Link>
            <Link href="/search" className="hover:text-[#171717] transition-colors">
              Search
            </Link>
            <a
              href="https://github.com/orpheohellandsjo/stack"
              className="hover:text-[#171717] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/usedev"
              className="hover:text-[#171717] transition-colors"
            >
              npm
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}

function CommandBlock({ text }: { text: string }) {
  return (
    <div className="group relative">
      <div className="font-mono text-sm rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-5 py-3">
        <span className="text-[#A3A3A3] select-none">$ </span>
        <span className="text-[#0A0A0A]">{text}</span>
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-4">
      <h2 className="text-sm font-medium text-[#737373] uppercase tracking-wider">{title}</h2>
      <span className="text-xs text-[#A3A3A3]">{subtitle}</span>
    </div>
  )
}

function EmptyState({ text, command }: { text: string; command?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#E5E5E5] px-6 py-10 text-center">
      <p className="text-sm text-[#A3A3A3]">{text}</p>
      {command !== undefined && (
        <code className="mt-2 inline-block font-mono text-xs text-[#737373]">{command}</code>
      )}
    </div>
  )
}
