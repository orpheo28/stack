import { describe, it, expect } from 'vitest'

// Test the sanitizeQuery function logic (extracted for testability)
function sanitizeQuery(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 100)
}

describe('Search API — sanitizeQuery', () => {
  it('should pass through normal alphanumeric queries', () => {
    expect(sanitizeQuery('stripe')).toBe('stripe')
    expect(sanitizeQuery('supabase')).toBe('supabase')
    expect(sanitizeQuery('my-tool')).toBe('my-tool')
    expect(sanitizeQuery('my_tool')).toBe('my_tool')
  })

  it('should strip PostgREST injection characters', () => {
    expect(sanitizeQuery('name.eq.test')).toBe('nameeqtest')
    expect(sanitizeQuery('%,name.neq.x%')).toBe('nameneqx')
    expect(sanitizeQuery("'; DROP TABLE tools;--")).toBe(' DROP TABLE tools--')
  })

  it('should strip special characters', () => {
    expect(sanitizeQuery('<script>alert(1)</script>')).toBe('scriptalert1script')
    expect(sanitizeQuery('test@example.com')).toBe('testexamplecom')
  })

  it('should truncate to 100 characters', () => {
    const long = 'a'.repeat(200)
    expect(sanitizeQuery(long).length).toBe(100)
  })

  it('should handle empty string', () => {
    expect(sanitizeQuery('')).toBe('')
  })

  it('should handle unicode', () => {
    expect(sanitizeQuery('café')).toBe('caf')
    expect(sanitizeQuery('日本語')).toBe('')
  })
})
