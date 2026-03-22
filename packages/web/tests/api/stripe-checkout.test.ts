import { describe, it, expect } from 'vitest'

// Extracted rate limiter logic from stripe/checkout/route.ts for testability
function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, number[]>()

  function isRateLimited(userId: string): boolean {
    const now = Date.now()
    const userAttempts = (attempts.get(userId) ?? []).filter((t) => now - t < windowMs)
    attempts.set(userId, userAttempts)
    if (userAttempts.length >= maxAttempts) return true
    userAttempts.push(now)
    return false
  }

  function reset(): void {
    attempts.clear()
  }

  return { isRateLimited, reset }
}

describe('Stripe Checkout — rate limiter', () => {
  it('should allow first request', () => {
    const limiter = createRateLimiter(3, 60_000)
    expect(limiter.isRateLimited('user-1')).toBe(false)
  })

  it('should allow up to max attempts', () => {
    const limiter = createRateLimiter(3, 60_000)
    expect(limiter.isRateLimited('user-1')).toBe(false) // 1
    expect(limiter.isRateLimited('user-1')).toBe(false) // 2
    expect(limiter.isRateLimited('user-1')).toBe(false) // 3
  })

  it('should block after max attempts', () => {
    const limiter = createRateLimiter(3, 60_000)
    limiter.isRateLimited('user-1') // 1
    limiter.isRateLimited('user-1') // 2
    limiter.isRateLimited('user-1') // 3
    expect(limiter.isRateLimited('user-1')).toBe(true)
  })

  it('should not block different users', () => {
    const limiter = createRateLimiter(1, 60_000)
    limiter.isRateLimited('user-1') // uses 1 attempt
    expect(limiter.isRateLimited('user-1')).toBe(true) // blocked
    expect(limiter.isRateLimited('user-2')).toBe(false) // different user, allowed
  })

  it('should allow after window expires', () => {
    // Use a tiny window so it expires immediately
    const limiter = createRateLimiter(1, 1) // 1ms window
    limiter.isRateLimited('user-1') // 1 attempt

    // Wait a bit for the window to expire
    const start = Date.now()
    while (Date.now() - start < 5) {
      // busy wait 5ms
    }

    expect(limiter.isRateLimited('user-1')).toBe(false) // window expired
  })

  it('should reset all state', () => {
    const limiter = createRateLimiter(1, 60_000)
    limiter.isRateLimited('user-1') // 1 attempt
    expect(limiter.isRateLimited('user-1')).toBe(true)
    limiter.reset()
    expect(limiter.isRateLimited('user-1')).toBe(false)
  })
})

describe('Stripe Checkout — env var guards', () => {
  it('requireEnv should throw on missing env var', () => {
    function requireEnv(name: string): string {
      const value = process.env[name]
      if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
      }
      return value
    }

    expect(() => requireEnv('DEFINITELY_NOT_SET_12345')).toThrow(
      'Missing required environment variable: DEFINITELY_NOT_SET_12345',
    )
  })

  it('requireEnv should return value when set', () => {
    function requireEnv(name: string): string {
      const value = process.env[name]
      if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
      }
      return value
    }

    process.env['TEST_ENV_GUARD'] = 'test-value'
    expect(requireEnv('TEST_ENV_GUARD')).toBe('test-value')
    delete process.env['TEST_ENV_GUARD']
  })
})
