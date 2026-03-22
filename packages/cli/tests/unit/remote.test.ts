import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { getRemoteTools, remoteToToolDefinition } from '../../src/registry/remote.js'

describe('remoteToToolDefinition', () => {
  it('should convert MCP tool from npm with mcpConfig', () => {
    const entry = {
      name: 'test-mcp',
      displayName: 'Test MCP',
      type: 'mcp',
      source: 'npm:@test/mcp-server',
      description: 'A test MCP server',
      installs: 42,
    }

    const def = remoteToToolDefinition(entry)

    expect(def.name).toBe('test-mcp')
    expect(def.type).toBe('mcp')
    expect(def.mcpConfig).toBeDefined()
    expect(def.mcpConfig?.command).toBe('npx')
    expect(def.mcpConfig?.args).toEqual(['-y', '@test/mcp-server'])
  })

  it('should convert SDK tool from npm with sdkPackage', () => {
    const entry = {
      name: 'test-sdk',
      displayName: 'Test SDK',
      type: 'sdk',
      source: 'npm:@test/sdk',
      description: 'A test SDK',
      installs: 10,
    }

    const def = remoteToToolDefinition(entry)

    expect(def.name).toBe('test-sdk')
    expect(def.type).toBe('sdk')
    expect(def.sdkPackage).toBe('@test/sdk')
    expect(def.mcpConfig).toBeUndefined()
  })

  it('should convert CLI tool without mcpConfig or sdkPackage', () => {
    const entry = {
      name: 'test-cli',
      displayName: 'Test CLI',
      type: 'cli',
      source: 'github:test/cli',
      description: 'A CLI tool',
      installs: 5,
    }

    const def = remoteToToolDefinition(entry)

    expect(def.name).toBe('test-cli')
    expect(def.type).toBe('cli')
    expect(def.mcpConfig).toBeUndefined()
    expect(def.sdkPackage).toBeUndefined()
  })

  it('should handle MCP tool from github without mcpConfig', () => {
    const entry = {
      name: 'gh-mcp',
      displayName: 'GitHub MCP',
      type: 'mcp',
      source: 'github:org/mcp-server',
      description: 'MCP from GitHub',
      installs: 1,
    }

    const def = remoteToToolDefinition(entry)

    // GitHub source — no npm convention, so no mcpConfig
    expect(def.mcpConfig).toBeUndefined()
  })
})

describe('getRemoteTools — cache behavior', () => {
  let tmpDir: string
  let homeDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-remote-test-'))
    homeDir = join(tmpDir, 'home')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should return empty array when offline and no cache', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = () => {
      throw new Error('Network error')
    }

    try {
      const tools = await getRemoteTools(homeDir)
      expect(tools).toEqual([])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should use cached data when cache is fresh', async () => {
    // Write a fresh cache
    const cachePath = join(homeDir, '.stack', 'cache', 'registry.json')
    await mkdir(join(cachePath, '..'), { recursive: true })
    const cacheData = {
      fetchedAt: Date.now(),
      tools: [
        {
          name: 'cached-tool',
          displayName: 'Cached',
          type: 'cli',
          source: 'npm:cached',
          description: 'From cache',
          installs: 99,
        },
      ],
    }
    await writeFile(cachePath, JSON.stringify(cacheData), 'utf-8')

    const tools = await getRemoteTools(homeDir)

    expect(tools.length).toBe(1)
    expect(tools[0]?.name).toBe('cached-tool')
  })

  it('should return stale cache when offline and cache exists', async () => {
    // Write a stale cache (2 hours old)
    const cachePath = join(homeDir, '.stack', 'cache', 'registry.json')
    await mkdir(join(cachePath, '..'), { recursive: true })
    const cacheData = {
      fetchedAt: Date.now() - 2 * 60 * 60 * 1000,
      tools: [
        {
          name: 'stale-tool',
          displayName: 'Stale',
          type: 'cli',
          source: 'npm:stale',
          description: 'Stale cached',
          installs: 1,
        },
      ],
    }
    await writeFile(cachePath, JSON.stringify(cacheData), 'utf-8')

    const originalFetch = globalThis.fetch
    globalThis.fetch = () => {
      throw new Error('Network error')
    }

    try {
      const tools = await getRemoteTools(homeDir)
      // Should fall back to stale cache
      expect(tools.length).toBe(1)
      expect(tools[0]?.name).toBe('stale-tool')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should handle corrupted cache gracefully', async () => {
    const cachePath = join(homeDir, '.stack', 'cache', 'registry.json')
    await mkdir(join(cachePath, '..'), { recursive: true })
    await writeFile(cachePath, 'NOT VALID JSON {{{', 'utf-8')

    const originalFetch = globalThis.fetch
    globalThis.fetch = () => {
      throw new Error('Network error')
    }

    try {
      const tools = await getRemoteTools(homeDir)
      expect(tools).toEqual([])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should write cache after successful fetch', async () => {
    const mockTools = [
      {
        name: 'fetched',
        displayName: 'Fetched',
        type: 'mcp',
        source: 'npm:fetched',
        description: 'Fresh',
        installs: 50,
      },
    ]

    const originalFetch = globalThis.fetch
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify(mockTools), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    try {
      const tools = await getRemoteTools(homeDir)
      expect(tools.length).toBe(1)
      expect(tools[0]?.name).toBe('fetched')

      // Cache file should now exist
      const cachePath = join(homeDir, '.stack', 'cache', 'registry.json')
      expect(existsSync(cachePath)).toBe(true)
      const cacheRaw = await readFile(cachePath, 'utf-8')
      const cache = JSON.parse(cacheRaw) as { fetchedAt: number; tools: unknown[] }
      expect(cache.tools.length).toBe(1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
