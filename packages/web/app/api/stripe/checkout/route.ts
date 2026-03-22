import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRO_PRICE_ID } from '@/lib/stripe'
import { log } from '@/lib/logger'

// In-memory rate limiter: max 3 checkout sessions per user per hour
const checkoutAttempts = new Map<string, number[]>()
const CHECKOUT_RATE_LIMIT = 3
const CHECKOUT_WINDOW_MS = 60 * 60 * 1000

function isCheckoutRateLimited(userId: string): boolean {
  const now = Date.now()
  const attempts = (checkoutAttempts.get(userId) ?? []).filter((t) => now - t < CHECKOUT_WINDOW_MS)
  checkoutAttempts.set(userId, attempts)
  if (attempts.length >= CHECKOUT_RATE_LIMIT) return true
  attempts.push(now)
  return false
}

export async function POST(req: Request): Promise<Response> {
  const start = Date.now()

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const { data: handle } = await service
      .from('handles')
      .select('handle, stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (handle === null) {
      return NextResponse.json(
        { error: 'No profile found. Publish your setup first.' },
        { status: 404 },
      )
    }

    // Rate limit: max 3 checkout sessions per user per hour
    if (isCheckoutRateLimited(user.id)) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Try again later.' },
        { status: 429 },
      )
    }

    // Create or reuse existing Stripe customer
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
      allow_promotion_codes: true,
    })

    log('info', 'stripe checkout session created', {
      path: '/api/stripe/checkout',
      method: 'POST',
      status: 200,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    log('error', 'stripe checkout session failed', {
      path: '/api/stripe/checkout',
      method: 'POST',
      status: 500,
      duration_ms: Date.now() - start,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
