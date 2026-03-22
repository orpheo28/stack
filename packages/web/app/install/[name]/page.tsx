import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const title = `Install ${name} — use.dev`
  const description = `Install ${name} in one command: npx stack install ${name}`
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'use.dev', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const TYPE_BADGE: Record<string, string> = {
  mcp: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  sdk: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cli: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  api: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  config: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

export const dynamic = 'force-dynamic'

export default async function InstallPage({ params }: Props) {
  const { name } = await params

  if (name !== name.toLowerCase()) {
    redirect(`/install/${name.toLowerCase()}`)
  }

  const supabase = createServiceClient()

  const result = await supabase.from('tools').select('*').eq('name', name.toLowerCase()).single()

  if (result.error !== null) notFound()
  const tool = result.data

  const command = `npx stack install ${tool.name}`

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Back */}
        <a
          href="/"
          className="text-zinc-600 hover:text-zinc-400 text-sm mb-8 inline-block transition-colors"
        >
          ← use.dev
        </a>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{tool.display_name}</h1>
            {tool.description !== null && <p className="text-zinc-400 mt-2">{tool.description}</p>}
          </div>
          <span
            className={`shrink-0 text-sm font-medium px-3 py-1 rounded-full border ${TYPE_BADGE[tool.type] ?? TYPE_BADGE['config']}`}
          >
            {tool.type}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4">
            <p className="text-2xl font-bold tabular-nums">
              {tool.installs_total.toLocaleString()}
            </p>
            <p className="text-zinc-500 text-sm mt-1">total installs</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4">
            <p className="text-2xl font-bold tabular-nums">
              {tool.installs_this_week.toLocaleString()}
            </p>
            <p className="text-zinc-500 text-sm mt-1">this week</p>
          </div>
        </div>

        {/* Install command */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 mb-6">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Install</p>
          <code className="block font-mono text-sm text-emerald-400 bg-zinc-950 rounded-lg px-4 py-3 border border-zinc-800">
            {command}
          </code>
        </div>

        {/* Source */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Source</p>
          <code className="text-sm text-zinc-300 font-mono">{tool.source}</code>
        </div>
      </div>
    </main>
  )
}
