import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRO_PRICE_ID, PLANS } from '@/lib/stripe'

async function manageSubscriptionAction(): Promise<never> {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) redirect('/auth/cli')

  const service = createServiceClient()
  const { data: handle } = await service
    .from('handles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  const customerId = handle?.stripe_customer_id as string | null
  if (customerId === null || customerId === '') {
    redirect('/dashboard/billing?error=no_subscription')
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://getstack.com'
  let portalUrl: string
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/billing`,
    })
    portalUrl = session.url
  } catch {
    portalUrl = '/dashboard/billing?error=portal_failed'
  }

  redirect(portalUrl)
}

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

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://getstack.com'
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
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Billing</h1>
        <p className="text-sm text-[#737373] mt-1">Manage your plan and subscription</p>
      </div>

      {/* Success / cancel banners */}
      {params.success === 'true' && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-700 font-medium">You&apos;re now on Pro. Thank you!</p>
        </div>
      )}
      {params.canceled === 'true' && (
        <div className="mb-6 p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg">
          <p className="text-sm text-[#737373]">Checkout canceled. No changes were made.</p>
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#0A0A0A]">Current plan</h2>
          <span
            className={`text-xs px-2 py-1 rounded font-medium border ${
              isPro
                ? 'bg-violet-500/10 text-violet-600 border-violet-500/15'
                : 'bg-[#F5F5F5] text-[#737373] border-[#E5E5E5]'
            }`}
          >
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
        <p className="text-3xl font-bold text-[#0A0A0A] tabular-nums">
          ${isPro ? PLANS.pro.price : PLANS.free.price}
          <span className="text-sm font-normal text-[#A3A3A3]">/month</span>
        </p>
        <p className="text-sm text-[#737373] mt-1">
          {isPro ? PLANS.pro.description : PLANS.free.description}
        </p>
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className={`rounded-lg p-5 border ${
            !isPro ? 'border-[#171717]' : 'border-[#E5E5E5]'
          } bg-[#FAFAFA]`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[#0A0A0A]">{PLANS.free.name}</p>
            {!isPro && (
              <span className="text-xs bg-[#F5F5F5] text-[#737373] px-1.5 py-0.5 rounded">
                Current
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-[#0A0A0A] mb-4">
            $0<span className="text-xs font-normal text-[#A3A3A3]">/mo</span>
          </p>
          <ul className="space-y-2">
            {PLANS.free.features.map((f) => (
              <li key={f} className="text-xs text-[#737373] flex items-start gap-2">
                <span className="text-[#A3A3A3] mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`rounded-lg p-5 border ${
            isPro ? 'border-[#171717]' : 'border-[#E5E5E5]'
          } bg-[#FAFAFA]`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[#0A0A0A]">{PLANS.pro.name}</p>
            {isPro && (
              <span className="text-xs bg-violet-500/10 text-violet-600 px-1.5 py-0.5 rounded">
                Current
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-[#0A0A0A] mb-4">
            ${PLANS.pro.price}
            <span className="text-xs font-normal text-[#A3A3A3]">/mo</span>
          </p>
          <ul className="space-y-2">
            {PLANS.pro.features.map((f) => (
              <li key={f} className="text-xs text-[#737373] flex items-start gap-2">
                <span className="text-violet-600 mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      {handle === null ? (
        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-5">
          <p className="text-sm text-[#737373]">Publish your setup first to access billing.</p>
        </div>
      ) : isPro ? (
        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-5">
          <p className="text-sm text-[#0A0A0A] font-medium mb-1">You&apos;re on Pro</p>
          <p className="text-xs text-[#A3A3A3] mb-3">
            Manage your subscription, update payment method, or cancel anytime.
          </p>
          <form action={manageSubscriptionAction}>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#FAFAFA] text-[#0A0A0A] rounded-lg text-sm font-medium hover:bg-[#F0F0F0] transition-colors border border-[#E5E5E5] cursor-pointer"
            >
              Manage subscription
            </button>
          </form>
        </div>
      ) : (
        <form action={createCheckoutAction}>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#262626] transition-colors cursor-pointer"
          >
            Upgrade to Pro — $9/month
          </button>
          <p className="text-xs text-[#A3A3A3] mt-2">Cancel anytime. Billed monthly via Stripe.</p>
        </form>
      )}
    </div>
  )
}
