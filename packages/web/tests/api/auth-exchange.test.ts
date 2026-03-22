import { describe, it, expect } from 'vitest'

// Extracted CLI session validation logic for testability
interface CliSession {
  used: boolean
  expires_at: string
}

function validateSession(
  session: CliSession | null,
): { ok: true } | { ok: false; status: number; error: string } {
  if (session === null) {
    return { ok: false, status: 404, error: 'Invalid token' }
  }
  if (session.used) {
    return { ok: false, status: 410, error: 'Token already used' }
  }
  if (new Date(session.expires_at) < new Date()) {
    return { ok: false, status: 410, error: 'Token expired' }
  }
  return { ok: true }
}

// Extracted username resolution
function resolveUsername(
  identities: Array<{ provider: string; identity_data?: Record<string, unknown> }> | undefined,
): string {
  const githubIdentity = identities?.find((i) => i.provider === 'github')
  return (githubIdentity?.identity_data?.['user_name'] as string | undefined) ?? 'unknown'
}

describe('Auth CLI Exchange — session validation', () => {
  it('should reject null session', () => {
    const result = validateSession(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
    }
  })

  it('should reject already used token', () => {
    const result = validateSession({ used: true, expires_at: '2099-01-01T00:00:00Z' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(410)
      expect(result.error).toBe('Token already used')
    }
  })

  it('should reject expired token', () => {
    const result = validateSession({ used: false, expires_at: '2020-01-01T00:00:00Z' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(410)
      expect(result.error).toBe('Token expired')
    }
  })

  it('should accept valid unused non-expired token', () => {
    const result = validateSession({ used: false, expires_at: '2099-01-01T00:00:00Z' })
    expect(result.ok).toBe(true)
  })
})

describe('Auth CLI Exchange — username resolution', () => {
  it('should extract GitHub username', () => {
    const identities = [{ provider: 'github', identity_data: { user_name: 'orpheo' } }]
    expect(resolveUsername(identities)).toBe('orpheo')
  })

  it('should return unknown when no identities', () => {
    expect(resolveUsername(undefined)).toBe('unknown')
    expect(resolveUsername([])).toBe('unknown')
  })

  it('should return unknown when no GitHub identity', () => {
    const identities = [{ provider: 'google', identity_data: { user_name: 'test' } }]
    expect(resolveUsername(identities)).toBe('unknown')
  })

  it('should return unknown when user_name is missing', () => {
    const identities = [{ provider: 'github', identity_data: {} }]
    expect(resolveUsername(identities)).toBe('unknown')
  })
})
