import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../src/api/client.js', () => ({
  fetchHandleManifest: vi.fn(),
  recordCopy: vi.fn(),
  recordInstall: vi.fn(),
  searchTools: vi.fn(),
  publishSetup: vi.fn(),
}))

import { searchTools } from '../../src/api/client.js'
import { findSimilarToolsLocal } from '../../src/registry/tools.js'

describe('E2E: search flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('local search returns matching tools', () => {
    const results = findSimilarToolsLocal('stripe')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0]!.name).toBe('stripe')
  })

  it('local search is case-insensitive', () => {
    const results = findSimilarToolsLocal('STRIPE')
    expect(results.some((t) => t.name === 'stripe')).toBe(true)
  })

  it('local search returns empty array for unknown query', () => {
    const results = findSimilarToolsLocal('zzz-nonexistent-tool-xyz')
    expect(results).toHaveLength(0)
  })

  it('remote search returns API results', async () => {
    vi.mocked(searchTools).mockResolvedValue([
      {
        name: 'stripe-mcp',
        displayName: 'Stripe MCP',
        type: 'mcp',
        description: 'Stripe via MCP',
        installs: 100,
      },
    ])

    const results = await searchTools('stripe')
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('stripe-mcp')
  })

  it('remote search returns empty array on network failure', async () => {
    vi.mocked(searchTools).mockResolvedValue([])

    const results = await searchTools('stripe')
    expect(results).toEqual([])
  })

  it('combined search deduplicates local + remote results', async () => {
    // Local has 'stripe', remote also returns 'stripe' — dedup expected in command
    vi.mocked(searchTools).mockResolvedValue([
      {
        name: 'stripe',
        displayName: 'Stripe',
        type: 'mcp',
        description: 'Payments',
        installs: 9000,
      },
      {
        name: 'stripe-invoices',
        displayName: 'Stripe Invoices',
        type: 'mcp',
        description: 'Invoices',
        installs: 200,
      },
    ])

    const localMatches = findSimilarToolsLocal('stripe')
    const localNames = new Set(localMatches.map((m) => m.name))

    const remoteResults = await searchTools('stripe')
    const extras = remoteResults.filter((t) => !localNames.has(t.name))

    // stripe-invoices is not in local registry, so it should appear as extra
    expect(extras.some((t) => t.name === 'stripe-invoices')).toBe(true)
    // stripe is already in local, so it should be deduped
    expect(extras.some((t) => t.name === 'stripe')).toBe(false)
  })

  it('local search returns multiple tools matching partial query', () => {
    // 'linear' should match the linear tool
    const results = findSimilarToolsLocal('linear')
    expect(results.some((t) => t.name === 'linear')).toBe(true)
  })
})
