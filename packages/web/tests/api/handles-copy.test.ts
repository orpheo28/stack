import { describe, it, expect } from 'vitest'

// Extracted copy event rate limiting logic for testability
function isCopyRateLimited(count: number | null): boolean {
  return count !== null && count > 0
}

// Extracted handle normalization
function normalizeHandle(raw: string): string {
  return raw.toLowerCase()
}

describe('Handles Copy API — rate limiting', () => {
  it('should rate limit when a copy exists in the window', () => {
    expect(isCopyRateLimited(1)).toBe(true)
    expect(isCopyRateLimited(3)).toBe(true)
  })

  it('should allow when no copy exists', () => {
    expect(isCopyRateLimited(0)).toBe(false)
  })

  it('should allow when count is null (IP missing)', () => {
    expect(isCopyRateLimited(null)).toBe(false)
  })
})

describe('Handles Copy API — handle normalization', () => {
  it('should lowercase handle', () => {
    expect(normalizeHandle('Orpheo')).toBe('orpheo')
    expect(normalizeHandle('THEO')).toBe('theo')
  })

  it('should preserve already lowercase handles', () => {
    expect(normalizeHandle('orpheo')).toBe('orpheo')
  })

  it('should preserve hyphens and underscores', () => {
    expect(normalizeHandle('my-handle_123')).toBe('my-handle_123')
  })
})
