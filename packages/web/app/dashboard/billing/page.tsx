import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRO_PRICE_ID, PLANS } from '@/lib/stripe'

async function createCheckoutAction(formData: FormData): Promise<never> {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) redirect('/auth/cli')

  const service = createServiceClient()
  const { data: handle } = await service
    .from('handles')
    .select('handle, stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (handle === null) redirect('/dashboard/billing?error=no_profile')

  // Create or reuse Stripe customer, then build checkout URL
  // All Stripe calls are wrapped so a Stripe error redirects gracefully
  let checkoutUrl: string
  try {
    let customerId = handle.stripe_customer_id as string | null
    if (customerId === null || customerId === '') {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id, handle: handle.handle },
      })
      customerId = customer.id
      await service
        .from('handles')
        .update({ stripe_customer_id: customerId })
        .eq('handle', handle.handle)
    }

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://use.dev'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=true`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      metadata: { user_id: user.id, handle: handle.handle },
    })

    checkoutUrl = session.url ?? '/dashboard/billing?error=checkout_failed'
  } catch {
    // Stripe API error, network failure, or misconfigured price ID
    checkoutUrl = '/dashboard/billing?error=checkout_failed'
  }

  // redirect() is called outside try-catch so Next.js processes it correctly
  redirect(checkoutUrl)
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; error?: string }>
}): Promise<React.JSX.Element> {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) redirect('/auth/cli')

  const service = createServiceClient()
  const { data: handle } = await service
    .from('handles')
    .select('handle, subscription_status')
    .eq('user_id', user.id)
    .single()

  const isPro = handle?.subscription_status === 'pro'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Billing</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your plan and subscription</p>
      </div>

      {/* Success / cancel banners */}
      {params.success === 'true' && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400 font-medium">You&apos;re now on Pro. Thank you!</p>
        </div>
      )}
      {params.canceled === 'true' && (
        <div className="mb-6 p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
          <p className="text-sm text-zinc-400">Checkout canceled. No changes were made.</p>
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300">Current plan</h2>
          <span
            className={`text-xs px-2 py-1 rounded font-medium border ${
              isPro
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
        <p className="text-3xl font-bold text-zinc-100 tabular-nums">
          ${isPro ? PLANS.pro.price : PLANS.free.price}
          <span className="text-sm font-normal text-zinc-500">/month</span>
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          {isPro ? PLANS.pro.description : PLANS.free.description}
        </p>
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className={`rounded-lg p-5 border ${
            !isPro ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-zinc-200">{PLANS.free.name}</p>
            {!isPro && (
              <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                Current
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-zinc-100 mb-4">
            $0<span className="text-xs font-normal text-zinc-500">/mo</span>
          </p>
          <ul className="space-y-2">
            {PLANS.free.features.map((f) => (
              <li key={f} className="text-xs text-zinc-400 flex items-start gap-2">
                <span className="text-zinc-500 mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`rounded-lg p-5 border ${
            isPro ? 'border-violet-500/50 bg-violet-500/5' : 'border-zinc-800 bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-zinc-200">{PLANS.pro.name}</p>
            {isPro && (
              <span className="text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">
                Current
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-zinc-100 mb-4">
            ${PLANS.pro.price}
            <span className="text-xs font-normal text-zinc-500">/mo</span>
          </p>
          <ul className="space-y-2">
            {PLANS.pro.features.map((f) => (
              <li key={f} className="text-xs text-zinc-400 flex items-start gap-2">
                <span className="text-violet-400 mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      {handle === null ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <p className="text-sm text-zinc-500">Publish your setup first to access billing.</p>
        </div>
      ) : isPro ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <p className="text-sm text-zinc-300 font-medium mb-1">You&apos;re on Pro</p>
          <p className="text-xs text-zinc-500">
            To manage or cancel your subscription, contact{' '}
            <a
              href="mailto:support@use.dev"
              className="text-zinc-400 hover:text-zinc-200 underline"
            >
              support@use.dev
            </a>
            .
          </p>
        </div>
      ) : (
        <form action={createCheckoutAction}>
          <button
            type="submit"
            className="px-6 py-2.5 bg-violet-600 text-white rounded text-sm font-semibold hover:bg-violet-500 transition-colors"
          >
            Upgrade to Pro — $9/month
          </button>
          <p className="text-xs text-zinc-600 mt-2">Cancel anytime. Billed monthly via Stripe.</p>
        </form>
      )}
    </div>
  )
}
