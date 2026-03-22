import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { installTool } from '../../src/commands/install.js'
import { findToolLocal } from '../../src/registry/tools.js'

describe('installTool', () => {
  let tmpDir: string
  let homeDir: string
  let projectRoot: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-install-test-'))
    homeDir = join(tmpDir, 'home')
    projectRoot = join(homeDir, 'project')
    await mkdir(projectRoot, { recursive: true })
    // Create package.json so project is detected as node
    await writeFile(join(projectRoot, 'package.json'), '{}', 'utf-8')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should install stripe MCP + env vars', async () => {
    // Create cursor config so MCP has somewhere to write
    const cursorPath = join(projectRoot, '.cursor', 'mcp.json')
    await mkdir(join(cursorPath, '..'), { recursive: true })
    await writeFile(cursorPath, '{}', 'utf-8')

    const tool = findToolLocal('stripe')
    expect(tool).toBeDefined()

    const result = await installTool(tool!, projectRoot, { homeDir, skipNpmInstall: true })

    expect(result.toolName).toBe('stripe')
    expect(result.displayName).toBe('Stripe')
    expect(result.mcpResults.length).toBeGreaterThanOrEqual(1)
    expect(result.envFilePath).not.toBeNull()
    expect(result.durationMs).toBeGreaterThanOrEqual(0)

    // Verify MCP config was written
    const mcpContent = JSON.parse(await readFile(cursorPath, 'utf-8')) as Record<string, unknown>
    const servers = mcpContent['mcpServers'] as Record<string, unknown>
    expect(servers['stripe']).toBeDefined()

    // Verify env file was created
    expect(existsSync(join(projectRoot, '.env'))).toBe(true)
    const envContent = await readFile(join(projectRoot, '.env'), 'utf-8')
    expect(envContent).toContain('STRIPE_API_KEY=')
  })

  it('should install supabase with SDK template', async () => {
    const cursorPath = join(projectRoot, '.cursor', 'mcp.json')
    await mkdir(join(cursorPath, '..'), { recursive: true })
    await writeFile(cursorPath, '{}', 'utf-8')

    const tool = findToolLocal('supabase')
    expect(tool).toBeDefined()

    const result = await installTool(tool!, projectRoot, { homeDir, skipNpmInstall: true })

    expect(result.sdkFilePath).not.toBeNull()
    expect(existsSync(join(projectRoot, 'src', 'lib', 'supabase.ts'))).toBe(true)

    const sdkContent = await readFile(join(projectRoot, 'src', 'lib', 'supabase.ts'), 'utf-8')
    expect(sdkContent).toContain('createClient')
  })

  it('should install anthropic SDK without MCP', async () => {
    const tool = findToolLocal('anthropic')
    expect(tool).toBeDefined()

    const result = await installTool(tool!, projectRoot, { homeDir, skipNpmInstall: true })

    // Anthropic is SDK type — no MCP config
    expect(result.mcpResults).toHaveLength(0)
    // But should have env vars and SDK template
    expect(result.envFilePath).not.toBeNull()
    expect(result.sdkFilePath).not.toBeNull()
  })

  it('should handle tool with no env vars', async () => {
    const cursorPath = join(projectRoot, '.cursor', 'mcp.json')
    await mkdir(join(cursorPath, '..'), { recursive: true })
    await writeFile(cursorPath, '{}', 'utf-8')

    const tool = findToolLocal('cloudflare')
    expect(tool).toBeDefined()

    const result = await installTool(tool!, projectRoot, { homeDir, skipNpmInstall: true })

    expect(result.mcpResults.length).toBeGreaterThanOrEqual(1)
    expect(result.envFilePath).toBeNull()
  })

  it('should return duration in milliseconds', async () => {
    const tool = findToolLocal('cloudflare')
    expect(tool).toBeDefined()

    const cursorPath = join(projectRoot, '.cursor', 'mcp.json')
    await mkdir(join(cursorPath, '..'), { recursive: true })
    await writeFile(cursorPath, '{}', 'utf-8')

    const result = await installTool(tool!, projectRoot, { homeDir, skipNpmInstall: true })

    expect(typeof result.durationMs).toBe('number')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('should install to multiple clients when detected', async () => {
    // Create both cursor and vscode configs
    const cursorPath = join(projectRoot, '.cursor', 'mcp.json')
    const vscodePath = join(projectRoot, '.vscode', 'mcp.json')
    await mkdir(join(cursorPath, '..'), { recursive: true })
    await writeFile(cursorPath, '{}', 'utf-8')
    await mkdir(join(vscodePath, '..'), { recursive: true })
    await writeFile(vscodePath, '{}', 'utf-8')

    const tool = findToolLocal('stripe')
    expect(tool).toBeDefined()

    const result = await installTool(tool!, projectRoot, { homeDir, skipNpmInstall: true })

    expect(result.mcpResults.length).toBe(2)
  })
})
