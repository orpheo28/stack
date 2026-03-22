import { describe, it, expect } from 'vitest'

// Extracted use_json validation logic from manifest route for testability
function parseUseJson(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return {}
}

function parseTools(useJson: Record<string, unknown>): Record<string, unknown> {
  const rawTools = useJson['tools']
  if (typeof rawTools === 'object' && rawTools !== null && !Array.isArray(rawTools)) {
    return rawTools as Record<string, unknown>
  }
  return {}
}

describe('Manifest API — use_json parsing', () => {
  it('should parse valid object', () => {
    const result = parseUseJson({ tools: { stripe: {} } })
    expect(result).toEqual({ tools: { stripe: {} } })
  })

  it('should return empty object for null', () => {
    expect(parseUseJson(null)).toEqual({})
  })

  it('should return empty object for string', () => {
    expect(parseUseJson('not an object')).toEqual({})
  })

  it('should return empty object for number', () => {
    expect(parseUseJson(42)).toEqual({})
  })

  it('should return empty object for array', () => {
    expect(parseUseJson([1, 2, 3])).toEqual({})
  })

  it('should return empty object for undefined', () => {
    expect(parseUseJson(undefined)).toEqual({})
  })
})

describe('Manifest API — tools parsing', () => {
  it('should extract valid tools object', () => {
    const result = parseTools({ tools: { stripe: { type: 'sdk' } } })
    expect(result).toEqual({ stripe: { type: 'sdk' } })
  })

  it('should return empty object when tools is missing', () => {
    expect(parseTools({})).toEqual({})
  })

  it('should return empty object when tools is a string', () => {
    expect(parseTools({ tools: 'invalid' })).toEqual({})
  })

  it('should return empty object when tools is an array', () => {
    expect(parseTools({ tools: ['a', 'b'] })).toEqual({})
  })

  it('should return empty object when tools is null', () => {
    expect(parseTools({ tools: null })).toEqual({})
  })

  it('should return empty object when tools is a number', () => {
    expect(parseTools({ tools: 123 })).toEqual({})
  })
})
