import { describe, it, expect } from 'vitest'
import { StackError, isStackError, ERROR_CODES } from '../../src/types/errors.js'

describe('StackError', () => {
  it('should create an error with the correct code and message', () => {
    const error = new StackError('STACK_001', 'Check your JSON syntax')
    expect(error.code).toBe('STACK_001')
    expect(error.message).toBe('[STACK_001] Invalid JSON in config file')
    expect(error.suggestion).toBe('Check your JSON syntax')
    expect(error.name).toBe('StackError')
  })

  it('should preserve the cause chain', () => {
    const cause = new Error('original error')
    const error = new StackError('STACK_004', 'Check your connection', cause)
    expect(error.cause).toBe(cause)
  })

  it('should be identified by isStackError type guard', () => {
    const stackError = new StackError('STACK_009', 'Path blocked')
    expect(isStackError(stackError)).toBe(true)
    expect(isStackError(new Error('generic'))).toBe(false)
    expect(isStackError(null)).toBe(false)
    expect(isStackError('string')).toBe(false)
  })

  it('should have all 10 error codes defined', () => {
    const codes = Object.keys(ERROR_CODES)
    expect(codes).toHaveLength(10)
    expect(codes[0]).toBe('STACK_001')
    expect(codes[9]).toBe('STACK_010')
  })

  it('should have a non-empty description for every error code', () => {
    for (const [code, description] of Object.entries(ERROR_CODES)) {
      expect(description, `${code} should have a description`).toBeTruthy()
      expect(typeof description).toBe('string')
    }
  })
})
