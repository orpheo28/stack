import { describe, it, expect } from 'vitest'
import { createProgram } from '../../src/index.js'

describe('CLI smoke test', () => {
  it('should create a program instance with name "stack"', () => {
    const program = createProgram()
    expect(program.name()).toBe('stack')
  })

  it('should have a version set', () => {
    const program = createProgram()
    const version = program.version()
    expect(version).toBeDefined()
    expect(version).not.toBe('0.0.0')
  })

  it('should have a description', () => {
    const program = createProgram()
    expect(program.description()).toContain('installer')
  })
})
