'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProfileData {
  handle: string
  display_name: string | null
  bio: string | null
  location: string | null
  github_username: string | null
}

export default function SettingsPage(): React.JSX.Element {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user === null) return

      const { data } = await supabase
        .from('handles')
        .select('handle, display_name, bio, location, github_username')
        .eq('user_id', user.id)
        .single()

      if (data !== null) {
        setProfile(data)
        setDisplayName(data.display_name ?? '')
        setBio(data.bio ?? '')
        setLocation(data.location ?? '')
      }
    }
    void load()
  }, [])

  const handleSave = async () => {
    if (profile === null) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('handles')
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
      })
      .eq('handle', profile.handle)

    setSaving(false)
    if (updateError !== null) {
      setError('Failed to save. Please try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Settings</h1>
        <p className="text-sm text-[#737373] mt-1">Edit your public profile</p>
      </div>

      {profile === null ? (
        <div className="text-[#A3A3A3] text-sm">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
                Handle
              </label>
              <p className="text-sm text-[#0A0A0A] font-mono bg-[#F5F5F5] rounded px-3 py-2">
                @{profile.handle}
              </p>
              <p className="text-xs text-[#A3A3A3] mt-1">Handle cannot be changed</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={64}
                placeholder="Your name"
                className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#A3A3A3] focus:outline-none focus:border-[#171717]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="A short description"
                className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#A3A3A3] focus:outline-none focus:border-[#171717] resize-none"
              />
              <p className="text-xs text-[#A3A3A3] mt-1">{bio.length}/160</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={64}
                placeholder="City, Country"
                className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#A3A3A3] focus:outline-none focus:border-[#171717]"
              />
            </div>

            {profile.github_username !== null && (
              <div>
                <label className="block text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
                  GitHub
                </label>
                <p className="text-sm text-[#737373] font-mono">@{profile.github_username}</p>
                <p className="text-xs text-[#A3A3A3] mt-1">Linked via OAuth — cannot be changed</p>
              </div>
            )}
          </div>

          {error !== null && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-5 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saved ? 'Saved' : saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}
