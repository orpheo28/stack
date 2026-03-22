import { describe, it, expect } from 'vitest'
import { REGISTRY } from '../../src/registry/tools.js'

describe('browse — registry categories', () => {
  it('should have tools in every expected category', () => {
    const expectedCategories = [
      'MCP — Cloud & SaaS',
      'MCP — Dev Tools',
      'MCP — AI & ML',
      'MCP — Official',
      'MCP — Databases',
      'SDKs — AI',
      'SDKs — Infrastructure',
      'SDKs — Payments & SaaS',
      'CLIs — Agent-native',
    ]

    const toolCategories = new Set<string>()
    for (const tool of REGISTRY.values()) {
      if (tool.category !== undefined) {
        toolCategories.add(tool.category)
      }
    }

    for (const cat of expectedCategories) {
      expect(toolCategories.has(cat), `Category "${cat}" should exist`).toBe(true)
    }
  })

  it('should have at least 5 tools in major categories', () => {
    const categoryCounts = new Map<string, number>()
    for (const tool of REGISTRY.values()) {
      const cat = tool.category ?? 'Other'
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)
    }

    expect(categoryCounts.get('MCP — Cloud & SaaS')).toBeGreaterThanOrEqual(15)
    expect(categoryCounts.get('MCP — Dev Tools')).toBeGreaterThanOrEqual(15)
    expect(categoryCounts.get('SDKs — AI')).toBeGreaterThanOrEqual(10)
  })

  it('should have no tools without a category', () => {
    for (const [name, tool] of REGISTRY) {
      expect(tool.category, `${name} should have a category`).toBeDefined()
      expect(tool.category, `${name} category should not be empty`).not.toBe('')
    }
  })
})
