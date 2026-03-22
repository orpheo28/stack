import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeMcpConfig } from '../../src/writers/mcp.js'
import type { McpServerConfig } from '../../src/writers/mcp.js'
import type { DetectedClient } from '../../src/detectors/context.js'

function makeClient(name: DetectedClient['name'], configPath: string): DetectedClient {
  return { name, tier: 1, configPath, certainty: 'confirmed' }
}

const stripeConfig: McpServerConfig = {
  command: 'npx',
  args: ['-y', '@stripe/mcp-server'],
  env: { STRIPE_API_KEY: '<your-key-here>' },
}

describe('writeMcpConfig', () => {
  let tmpDir: string
  let homeDir: string
  let projectRoot: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-mcp-test-'))
    homeDir = join(tmpDir, 'home')
    projectRoot = join(homeDir, 'project')
    await mkdir(projectRoot, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should create a new config file with the MCP server entry', async () => {
    const configPath = join(homeDir, '.cursor', 'mcp.json')
    await mkdir(join(configPath, '..'), { recursive: true })
    const client = makeClient('cursor', configPath)

    const results = await writeMcpConfig([client], 'stripe', stripeConfig, projectRoot, homeDir)

    expect(results).toHaveLength(1)
    expect(results[0]?.action).toBe('added')

    const content = JSON.parse(await readFile(configPath, 'utf-8')) as Record<string, unknown>
    const servers = content['mcpServers'] as Record<string, unknown>
    expect(servers['stripe']).toBeDefined()
  })

  it('should merge into an existing config without overwriting other entries', async () => {
    const configPath = join(homeDir, '.cursor', 'mcp.json')
    await mkdir(join(configPath, '..'), { recursive: true })
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          existing: { command: 'npx', args: ['existing-server'] },
        },
      }),
      'utf-8',
    )

    const client = makeClient('cursor', configPath)
    await writeMcpConfig([client], 'stripe', stripeConfig, projectRoot, homeDir)

    const content = JSON.parse(await readFile(configPath, 'utf-8')) as Record<string, unknown>
    const servers = content['mcpServers'] as Record<string, unknown>
    expect(servers['existing']).toBeDefined()
    expect(servers['stripe']).toBeDefined()
  })

  it('should write to multiple clients simultaneously', async () => {
    const cursorPath = join(homeDir, '.cursor', 'mcp.json')
    const vscodePath = join(projectRoot, '.vscode', 'mcp.json')
    await mkdir(join(cursorPath, '..'), { recursive: true })
    await mkdir(join(vscodePath, '..'), { recursive: true })

    const clients: DetectedClient[] = [
      makeClient('cursor', cursorPath),
      makeClient('vscode', vscodePath),
    ]

    const results = await writeMcpConfig(clients, 'stripe', stripeConfig, projectRoot, homeDir)

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.action === 'added')).toBe(true)
  })

  it('should skip non-MCP clients (e.g., claude-code tier 2)', async () => {
    const claudeMdPath = join(projectRoot, 'CLAUDE.md')
    await writeFile(claudeMdPath, '# Project', 'utf-8')

    const clients: DetectedClient[] = [
      { name: 'claude-code', tier: 2, configPath: claudeMdPath, certainty: 'confirmed' },
    ]

    const results = await writeMcpConfig(clients, 'stripe', stripeConfig, projectRoot, homeDir)
    expect(results).toHaveLength(0)
  })

  it('should handle Claude Desktop config format', async () => {
    const configPath = join(
      homeDir,
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json',
    )
    await mkdir(join(configPath, '..'), { recursive: true })
    await writeFile(configPath, '{}', 'utf-8')

    const client = makeClient('claude-desktop', configPath)
    const results = await writeMcpConfig([client], 'stripe', stripeConfig, projectRoot, homeDir)

    expect(results).toHaveLength(1)
    const content = JSON.parse(await readFile(configPath, 'utf-8')) as Record<string, unknown>
    const servers = content['mcpServers'] as Record<string, unknown>
    expect(servers['stripe']).toBeDefined()
  })

  it('should validate JSON before writing', async () => {
    const configPath = join(homeDir, '.cursor', 'mcp.json')
    await mkdir(join(configPath, '..'), { recursive: true })
    // Write invalid JSON — writer should handle gracefully
    await writeFile(configPath, 'not valid json', 'utf-8')

    const client = makeClient('cursor', configPath)

    // Should still work — treats corrupt file as empty config
    const results = await writeMcpConfig([client], 'stripe', stripeConfig, projectRoot, homeDir)
    expect(results).toHaveLength(1)

    // Result should be valid JSON
    const content = await readFile(configPath, 'utf-8')
    expect(() => JSON.parse(content)).not.toThrow()
  })

  it('should return correct configPath in results', async () => {
    const configPath = join(homeDir, '.cursor', 'mcp.json')
    await mkdir(join(configPath, '..'), { recursive: true })

    const client = makeClient('cursor', configPath)
    const results = await writeMcpConfig([client], 'stripe', stripeConfig, projectRoot, homeDir)

    expect(results[0]?.configPath).toBe(configPath)
    expect(results[0]?.client).toBe('cursor')
  })

  it('should include env vars in the MCP server config', async () => {
    const configPath = join(homeDir, '.cursor', 'mcp.json')
    await mkdir(join(configPath, '..'), { recursive: true })

    const client = makeClient('cursor', configPath)
    await writeMcpConfig([client], 'stripe', stripeConfig, projectRoot, homeDir)

    const content = JSON.parse(await readFile(configPath, 'utf-8')) as Record<string, unknown>
    const servers = content['mcpServers'] as Record<string, Record<string, unknown>>
    const stripe = servers['stripe']
    expect(stripe?.['env']).toEqual({ STRIPE_API_KEY: '<your-key-here>' })
  })
})
