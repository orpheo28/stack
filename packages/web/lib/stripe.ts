import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe === null) {
    const key = process.env['STRIPE_SECRET_KEY']
    if (!key) {
      throw new Error('Missing required environment variable: STRIPE_SECRET_KEY')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return _stripe
}

/** @deprecated Use getStripe() for lazy initialization */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
})

export const STRIPE_PRO_PRICE_ID = process.env['STRIPE_PRO_PRICE_ID'] ?? ''
export const STRIPE_WEBHOOK_SECRET = process.env['STRIPE_WEBHOOK_SECRET'] ?? ''

export const PLANS = {
  free: {
    name: 'Free',
    description: 'For individual developers',
    price: 0,
    features: ['Public profile', 'Unlimited tools', 'Copy analytics'],
  },
  pro: {
    name: 'Pro',
    description: 'For power users and teams',
    price: 9,
    features: [
      'Everything in Free',
      'Detailed analytics (30-day history)',
      'Priority support',
      'Custom domain for profile',
      'Badge on profile',
    ],
  },
} as const

export type Plan = keyof typeof PLANS
