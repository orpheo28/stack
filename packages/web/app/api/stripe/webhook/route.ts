import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { log } from '@/lib/logger'
import type Stripe from 'stripe'

// Stripe requires the raw body for signature verification
export const runtime = 'nodejs'

export async function POST(req: Request): Promise<Response> {
  const start = Date.now()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    log('error', 'stripe webhook signature verification failed', {
      path: '/api/stripe/webhook',
      method: 'POST',
      status: 400,
      duration_ms: Date.now() - start,
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const service = createServiceClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const obj = event.data.object
        if (!('status' in obj) || !('customer' in obj)) {
          log('warn', 'stripe webhook: unexpected object shape for subscription event', {
            path: '/api/stripe/webhook',
            method: 'POST',
            status: 400,
            event_type: event.type,
          })
          return NextResponse.json({ error: 'Unexpected event data' }, { status: 400 })
        }
        const sub = obj as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        // Active or trialing = Pro; anything else = Free
        const status = sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free'

        const { error } = await service
          .from('handles')
          .update({ subscription_status: status })
          .eq('stripe_customer_id', customerId)

        if (error !== null) {
          log('error', `stripe webhook: failed to update subscription status for ${customerId}`, {
            path: '/api/stripe/webhook',
            method: 'POST',
            status: 500,
            duration_ms: Date.now() - start,
          })
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const delObj = event.data.object
        if (!('status' in delObj) || !('customer' in delObj)) {
          log('warn', 'stripe webhook: unexpected object shape for subscription.deleted', {
            path: '/api/stripe/webhook',
            method: 'POST',
            status: 400,
            event_type: event.type,
          })
          return NextResponse.json({ error: 'Unexpected event data' }, { status: 400 })
        }
        const sub = delObj as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        const { error } = await service
          .from('handles')
          .update({ subscription_status: 'free' })
          .eq('stripe_customer_id', customerId)

        if (error !== null) {
          log('error', `stripe webhook: failed to downgrade handle for ${customerId}`, {
            path: '/api/stripe/webhook',
            method: 'POST',
            status: 500,
            duration_ms: Date.now() - start,
          })
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }
        break
      }

      default:
        // Ignore unhandled event types
        break
    }

    log('info', `stripe webhook handled: ${event.type}`, {
      path: '/api/stripe/webhook',
      method: 'POST',
      status: 200,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    log('error', 'stripe webhook handler threw', {
      path: '/api/stripe/webhook',
      method: 'POST',
      status: 500,
      duration_ms: Date.now() - start,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
