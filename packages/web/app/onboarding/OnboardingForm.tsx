'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{1,38}$/

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function OnboardingForm() {
  const router = useRouter()
  const [handle, setHandle] = useState('')
  const [checkState, setCheckState] = useState<CheckState>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (handle === '') {
      setCheckState('idle')
      return
    }

    if (!HANDLE_RE.test(handle)) {
      setCheckState('invalid')
      return
    }

    setCheckState('checking')
    if (debounceRef.current !== null) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handles/check?handle=${encodeURIComponent(handle)}`)
        if (!res.ok) {
          setCheckState('idle')
          return
        }
        const json = (await res.json()) as { available: boolean }
        setCheckState(json.available ? 'available' : 'taken')
      } catch {
        setCheckState('idle')
      }
    }, 400)

    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current)
    }
  }, [handle])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (checkState !== 'available') return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setError(json.error ?? 'Failed to create profile')
        return
      }

      router.push(`/@${handle}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const inputBorder =
    checkState === 'available'
      ? 'border-green-500 focus:ring-green-500'
      : checkState === 'taken' || checkState === 'invalid'
        ? 'border-red-400 focus:ring-red-400'
        : 'border-[#E5E5E5] focus:ring-[#171717]'

  const hint =
    checkState === 'available'
      ? { text: 'Available', color: 'text-green-600' }
      : checkState === 'taken'
        ? { text: 'Already taken', color: 'text-red-500' }
        : checkState === 'invalid'
          ? {
              text: '2–39 chars, lowercase letters, numbers, hyphens, underscores',
              color: 'text-red-500',
            }
          : checkState === 'checking'
            ? { text: 'Checking…', color: 'text-[#A3A3A3]' }
            : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="handle" className="block text-sm font-medium text-[#0A0A0A] mb-2">
          Choose your handle
        </label>
        <div className="flex items-center gap-0">
          <span className="inline-flex items-center px-3 h-10 border border-r-0 border-[#E5E5E5] rounded-l-md bg-[#F5F5F5] text-[#737373] text-sm select-none">
            @
          </span>
          <input
            id="handle"
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="yourhandle"
            className={`h-10 flex-1 px-3 border rounded-r-md bg-white text-[#0A0A0A] text-sm font-mono outline-none focus:ring-1 transition-colors ${inputBorder}`}
          />
        </div>
        {hint !== null && <p className={`mt-1.5 text-xs ${hint.color}`}>{hint.text}</p>}
      </div>

      {error !== null && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={checkState !== 'available' || submitting}
        className="w-full h-10 bg-[#171717] text-white text-sm font-medium rounded-md hover:bg-[#0A0A0A] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {submitting ? 'Creating…' : 'Create my profile'}
      </button>
    </form>
  )
}
