import { describe, it, expect } from 'vitest'
import { REGISTRY, findTool, findSimilarTools } from '../../src/registry/tools.js'

describe('REGISTRY', () => {
  it('should have 20 tools defined', () => {
    expect(REGISTRY.size).toBe(20)
  })

  it('should find stripe by name', () => {
    const stripe = findTool('stripe')
    expect(stripe).toBeDefined()
    expect(stripe?.displayName).toBe('Stripe')
    expect(stripe?.type).toBe('mcp')
    expect(stripe?.mcpConfig).toBeDefined()
    expect(stripe?.envVars).toBeDefined()
  })

  it('should return undefined for unknown tools', () => {
    expect(findTool('nonexistent')).toBeUndefined()
  })

  it('should find similar tools by partial name', () => {
    const results = findSimilarTools('stripe')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0]?.name).toBe('stripe')
  })

  it('should have all required fields for MCP tools', () => {
    for (const [name, tool] of REGISTRY) {
      if (tool.type === 'mcp') {
        expect(tool.mcpConfig, `${name} should have mcpConfig`).toBeDefined()
      }
    }
  })

  it('should have sdkPackage for SDK tools', () => {
    for (const [name, tool] of REGISTRY) {
      if (tool.type === 'sdk') {
        expect(tool.sdkPackage, `${name} should have sdkPackage`).toBeDefined()
      }
    }
  })
})
