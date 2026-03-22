import { describe, it, expect } from 'vitest'

// Extracted type guard logic from stripe webhook route for testability
function isSubscriptionObject(obj: Record<string, unknown>): boolean {
  return 'status' in obj && 'customer' in obj
}

function resolveCustomerId(customer: unknown): string | null {
  if (typeof customer === 'string') return customer
  if (typeof customer === 'object' && customer !== null && 'id' in customer) {
    return (customer as { id: string }).id
  }
  return null
}

function resolveSubscriptionStatus(status: string): 'pro' | 'free' {
  return status === 'active' || status === 'trialing' ? 'pro' : 'free'
}

describe('Stripe Webhook — subscription type guard', () => {
  it('should accept valid subscription object', () => {
    expect(isSubscriptionObject({ status: 'active', customer: 'cus_123' })).toBe(true)
  })

  it('should reject object missing status', () => {
    expect(isSubscriptionObject({ customer: 'cus_123' })).toBe(false)
  })

  it('should reject object missing customer', () => {
    expect(isSubscriptionObject({ status: 'active' })).toBe(false)
  })

  it('should reject empty object', () => {
    expect(isSubscriptionObject({})).toBe(false)
  })
})

describe('Stripe Webhook — customer ID resolution', () => {
  it('should resolve string customer directly', () => {
    expect(resolveCustomerId('cus_123')).toBe('cus_123')
  })

  it('should resolve object customer with id', () => {
    expect(resolveCustomerId({ id: 'cus_456' })).toBe('cus_456')
  })

  it('should return null for null customer', () => {
    expect(resolveCustomerId(null)).toBeNull()
  })

  it('should return null for number', () => {
    expect(resolveCustomerId(42)).toBeNull()
  })
})

describe('Stripe Webhook — subscription status mapping', () => {
  it('should map active to pro', () => {
    expect(resolveSubscriptionStatus('active')).toBe('pro')
  })

  it('should map trialing to pro', () => {
    expect(resolveSubscriptionStatus('trialing')).toBe('pro')
  })

  it('should map canceled to free', () => {
    expect(resolveSubscriptionStatus('canceled')).toBe('free')
  })

  it('should map past_due to free', () => {
    expect(resolveSubscriptionStatus('past_due')).toBe('free')
  })

  it('should map unpaid to free', () => {
    expect(resolveSubscriptionStatus('unpaid')).toBe('free')
  })
})
