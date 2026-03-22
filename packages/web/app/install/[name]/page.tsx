import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const title = `Install ${name} — getstack.com`
  const description = `Install ${name} in one command: npx usedev install ${name}`
  const ogImage = `/api/og?tool=${encodeURIComponent(name)}`
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'getstack.com', type: 'website', images: [ogImage] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

const TYPE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  mcp: { bg: 'bg-violet-500/8', text: 'text-violet-600', border: 'border-violet-500/15' },
  sdk: { bg: 'bg-blue-500/8', text: 'text-blue-600', border: 'border-blue-500/15' },
  cli: { bg: 'bg-emerald-500/8', text: 'text-emerald-600', border: 'border-emerald-500/15' },
  api: { bg: 'bg-amber-500/8', text: 'text-amber-600', border: 'border-amber-500/15' },
  config: { bg: 'bg-gray-500/8', text: 'text-gray-600', border: 'border-gray-500/15' },
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

  const command = `npx usedev install ${tool.name}`
  const fallback = { bg: 'bg-gray-500/8', text: 'text-gray-600', border: 'border-gray-500/15' }
  const badge = TYPE_BADGE[tool.type] ?? fallback

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-20">
        {/* Back */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#171717] transition-colors mb-12"
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
          getstack.com
        </a>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
              {tool.display_name}
            </h1>
            {tool.description !== null && (
              <p className="text-[#737373] mt-2 text-[15px] leading-relaxed">{tool.description}</p>
            )}
          </div>
          <span
            className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {tool.type}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-[#E5E5E5] mb-8 bg-[#E5E5E5]">
          <div className="bg-white px-5 py-4 text-center">
            <p className="text-2xl font-bold text-[#0A0A0A] tabular-nums font-mono">
              {tool.installs_total.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#A3A3A3] mt-1">total installs</p>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <p className="text-2xl font-bold text-[#0A0A0A] tabular-nums font-mono">
              {tool.installs_this_week.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#A3A3A3] mt-1">this week</p>
          </div>
        </div>

        {/* Install command */}
        <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-5 mb-6">
          <p className="text-[11px] text-[#A3A3A3] uppercase tracking-widest font-medium mb-3">
            Install
          </p>
          <div className="font-mono text-sm rounded-lg bg-white border border-[#E5E5E5] px-4 py-3">
            <span className="text-[#A3A3A3] select-none">$ </span>
            <span className="text-[#0A0A0A]">{command}</span>
          </div>
        </div>

        {/* Source */}
        {tool.source !== null && (
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-5">
            <p className="text-[11px] text-[#A3A3A3] uppercase tracking-widest font-medium mb-3">
              Source
            </p>
            <code className="text-sm text-[#737373] font-mono">{tool.source}</code>
          </div>
        )}
      </div>
    </main>
  )
}
