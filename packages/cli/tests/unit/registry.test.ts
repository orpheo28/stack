import { describe, it, expect } from 'vitest'
import { REGISTRY, findToolLocal, findSimilarToolsLocal } from '../../src/registry/tools.js'

describe('REGISTRY', () => {
  it('should have at least 120 tools defined', () => {
    expect(REGISTRY.size).toBeGreaterThanOrEqual(120)
  })

  it('should have description for every tool', () => {
    for (const [name, tool] of REGISTRY) {
      expect(tool.description, `${name} should have description`).toBeDefined()
      expect(tool.description.length, `${name} description should not be empty`).toBeGreaterThan(0)
    }
  })

  it('should have category for every tool', () => {
    for (const [name, tool] of REGISTRY) {
      expect(tool.category, `${name} should have category`).toBeDefined()
    }
  })

  it('should have installMode "both" for tools with skillFile', () => {
    for (const [name, tool] of REGISTRY) {
      if (tool.skillFile !== undefined) {
        expect(tool.installMode, `${name} with skillFile should have installMode`).toBe('both')
        expect(tool.cliCommand, `${name} with skillFile should have cliCommand`).toBeDefined()
      }
    }
  })

  it('should find stripe by name', () => {
    const stripe = findToolLocal('stripe')
    expect(stripe).toBeDefined()
    expect(stripe?.displayName).toBe('Stripe')
    expect(stripe?.type).toBe('mcp')
    expect(stripe?.mcpConfig).toBeDefined()
    expect(stripe?.envVars).toBeDefined()
  })

  it('should return undefined for unknown tools', () => {
    expect(findToolLocal('nonexistent')).toBeUndefined()
  })

  it('should find similar tools by partial name', () => {
    const results = findSimilarToolsLocal('stripe')
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

  it('should find new MCP servers (Phase C)', () => {
    const newMcpTools = [
      'playwright',
      'sentry',
      'slack',
      'figma',
      'docker',
      'prisma',
      'firebase',
      'perplexity',
      'brave-search',
      'e2b',
      'pinecone',
      'firecrawl',
      'mongodb',
      'exa',
    ]
    for (const name of newMcpTools) {
      const tool = findToolLocal(name)
      expect(tool, `${name} should exist in registry`).toBeDefined()
      expect(tool?.type).toBe('mcp')
      expect(tool?.mcpConfig).toBeDefined()
    }
  })

  it('should find new SDKs (Phase C)', () => {
    const newSdkTools = [
      'openai',
      'google-ai',
      'vercel-ai',
      'mistral',
      'groq',
      'langchain',
      'stripe-sdk',
      'drizzle',
    ]
    for (const name of newSdkTools) {
      const tool = findToolLocal(name)
      expect(tool, `${name} should exist in registry`).toBeDefined()
      expect(tool?.type).toBe('sdk')
      expect(tool?.sdkPackage).toBeDefined()
    }
  })

  it('should find similar tools for partial "str" search', () => {
    const results = findSimilarToolsLocal('str')
    const names = results.map((t) => t.name)
    expect(names).toContain('stripe')
    expect(names).toContain('stripe-sdk')
  })

  it('should have sdkTemplate for all SDK tools', () => {
    for (const [name, tool] of REGISTRY) {
      if (tool.type === 'sdk') {
        expect(tool.sdkTemplate, `${name} should have sdkTemplate`).toBeDefined()
        expect(tool.sdkTemplate!.length, `${name} sdkTemplate should not be empty`).toBeGreaterThan(
          0,
        )
      }
    }
  })
})
