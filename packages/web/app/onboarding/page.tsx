import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { OnboardingForm } from './OnboardingForm'

export const metadata = { title: 'Set up your profile — Stack' }

export default async function OnboardingPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) redirect('/auth/cli')

  // Already has a handle — skip onboarding
  const service = createServiceClient()
  const { data: handle } = await service
    .from('handles')
    .select('handle')
    .eq('user_id', user.id)
    .maybeSingle()

  if (handle !== null) redirect(`/@${handle.handle}`)

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[#0A0A0A]">Welcome to Stack</h1>
          <p className="text-sm text-[#737373] mt-2">
            Claim your handle to publish your developer setup.
          </p>
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 shadow-sm">
          <OnboardingForm />
        </div>
        <p className="text-center text-xs text-[#A3A3A3] mt-6">
          Your profile will be live at{' '}
          <span className="font-mono text-[#737373]">getstack.com/@yourhandle</span>
        </p>
      </div>
    </div>
  )
}
