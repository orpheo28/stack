import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const title = `Install ${name} — use.dev`
  const description = `Install ${name} in one command: npx stackdev install ${name}`
  const ogImage = `/api/og?tool=${encodeURIComponent(name)}`
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'use.dev', type: 'website', images: [ogImage] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

const TYPE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  mcp: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  sdk: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  cli: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  api: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  config: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' },
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

  const command = `npx stackdev install ${tool.name}`
  const fallback = { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' }
  const badge = TYPE_BADGE[tool.type] ?? fallback

  return (
    <main className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,hsla(260,60%,20%,0.3),transparent)]" />

      <div className="mx-auto max-w-2xl px-6 py-20">
        {/* Back */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-12"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          use.dev
        </a>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">{tool.display_name}</h1>
            {tool.description !== null && (
              <p className="text-zinc-400 mt-2 leading-relaxed">{tool.description}</p>
            )}
          </div>
          <span
            className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {tool.type}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-zinc-800 mb-8 bg-zinc-800">
          <div className="bg-zinc-950/80 px-5 py-4 text-center">
            <p className="text-2xl font-bold text-white tabular-nums font-mono">
              {tool.installs_total.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-600 mt-1">total installs</p>
          </div>
          <div className="bg-zinc-950/80 px-5 py-4 text-center">
            <p className="text-2xl font-bold text-white tabular-nums font-mono">
              {tool.installs_this_week.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-600 mt-1">this week</p>
          </div>
        </div>

        {/* Install command */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5 mb-6 backdrop-blur-sm">
          <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium mb-3">
            Install
          </p>
          <div className="font-mono text-sm rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
            <span className="text-zinc-600 select-none">$ </span>
            <span className="text-emerald-400">{command}</span>
          </div>
        </div>

        {/* Source */}
        {tool.source !== null && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5 backdrop-blur-sm">
            <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium mb-3">
              Source
            </p>
            <code className="text-sm text-zinc-400 font-mono">{tool.source}</code>
          </div>
        )}
      </div>
    </main>
  )
}
