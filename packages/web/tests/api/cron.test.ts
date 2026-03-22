import { describe, it, expect } from 'vitest'

// Extracted cron auth logic for testability
function verifyCronAuth(
  authHeader: string | null,
  cronSecret: string | undefined,
): { ok: boolean; status: number; error?: string } {
  if (!cronSecret) {
    return { ok: false, status: 500, error: 'CRON_SECRET not configured' }
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true, status: 200 }
}

describe('Cron API — auth guard', () => {
  it('should reject when CRON_SECRET is undefined', () => {
    const result = verifyCronAuth('Bearer anything', undefined)
    expect(result.ok).toBe(false)
    expect(result.status).toBe(500)
    expect(result.error).toBe('CRON_SECRET not configured')
  })

  it('should reject when CRON_SECRET is empty string', () => {
    const result = verifyCronAuth('Bearer ', '')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(500)
  })

  it('should reject when auth header is missing', () => {
    const result = verifyCronAuth(null, 'my-secret')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
  })

  it('should reject when auth header does not match', () => {
    const result = verifyCronAuth('Bearer wrong-secret', 'my-secret')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
  })

  it('should reject Bearer undefined when secret is not set', () => {
    // This was the original vulnerability: "Bearer undefined" would match
    const result = verifyCronAuth('Bearer undefined', undefined)
    expect(result.ok).toBe(false)
    expect(result.status).toBe(500)
  })

  it('should accept valid Bearer token', () => {
    const result = verifyCronAuth('Bearer my-secret-123', 'my-secret-123')
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
  })
})
