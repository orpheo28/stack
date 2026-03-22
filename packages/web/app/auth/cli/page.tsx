'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CLIAuthInner() {
  const searchParams = useSearchParams()
  const port = searchParams.get('port')
  const state = searchParams.get('state')

  useEffect(() => {
    if (port === null || state === null) return

    const supabase = createClient()
    void supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/cli/callback?port=${encodeURIComponent(port)}&state=${encodeURIComponent(state)}`,
      },
    })
  }, [port, state])

  if (port === null || state === null) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="max-w-sm w-full px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Request</h1>
          <p className="text-zinc-400 text-sm">
            Missing parameters. Please run <code className="text-zinc-200">stack login</code> from
            your terminal.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="max-w-sm w-full px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Signing in...</h1>
        <p className="text-zinc-400 text-sm">Redirecting to GitHub for authentication.</p>
      </div>
    </main>
  )
}

export default function CLIAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <div className="max-w-sm w-full px-4 text-center">
            <p className="text-zinc-400 text-sm">Loading...</p>
          </div>
        </main>
      }
    >
      <CLIAuthInner />
    </Suspense>
  )
}
