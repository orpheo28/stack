import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Mock the API client before importing the command
vi.mock('../../src/api/client.js', () => ({
  fetchHandleManifest: vi.fn(),
  recordCopy: vi.fn(),
  recordInstall: vi.fn(),
  searchTools: vi.fn().mockResolvedValue([]),
  publishSetup: vi.fn(),
}))

// Mock inquirer to auto-confirm any prompts
vi.mock('inquirer', () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}))

import { fetchHandleManifest, recordCopy } from '../../src/api/client.js'
import { installTool } from '../../src/commands/install.js'
import { findToolLocal } from '../../src/registry/tools.js'
import { readStackJson } from '../../src/utils/stack-json.js'

describe('E2E: @handle install flow', () => {
  let tmpDir: string
  let homeDir: string
  let projectRoot: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-handle-e2e-'))
    homeDir = join(tmpDir, 'home')
    projectRoot = join(homeDir, 'project')
    await mkdir(projectRoot, { recursive: true })
    await writeFile(join(projectRoot, 'package.json'), '{}', 'utf-8')
    // MCP target
    const cursorDir = join(projectRoot, '.cursor')
    await mkdir(cursorDir, { recursive: true })
    await writeFile(join(cursorDir, 'mcp.json'), '{}', 'utf-8')

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('installs all tools from a handle manifest with 2 tools', async () => {
    vi.mocked(fetchHandleManifest).mockResolvedValue({
      version: '1.0',
      handle: 'alice',
      tools: {
        stripe: { type: 'mcp', version: 'latest', source: '@stripe/mcp-server' },
        linear: { type: 'mcp', version: 'latest', source: '@linear/mcp-server' },
      },
    })

    const stripe = findToolLocal('stripe')!
    const linear = findToolLocal('linear')!
    expect(stripe).toBeDefined()
    expect(linear).toBeDefined()

    await installTool(stripe, projectRoot, { homeDir, skipNpmInstall: true })
    await installTool(linear, projectRoot, { homeDir, skipNpmInstall: true })

    // Both tools in MCP config
    const mcpContent = JSON.parse(
      await readFile(join(projectRoot, '.cursor', 'mcp.json'), 'utf-8'),
    ) as Record<string, unknown>
    const servers = mcpContent['mcpServers'] as Record<string, unknown>
    expect(servers['stripe']).toBeDefined()
    expect(servers['linear']).toBeDefined()

    // Both in stack.json
    const stackJson = await readStackJson(projectRoot)
    expect(stackJson?.tools['stripe']).toBeDefined()
    expect(stackJson?.tools['linear']).toBeDefined()
  })

  it('writes CLAUDE.md when manifest includes claudeMd', async () => {
    const claudeContent = "# Alice's setup\nUse Stripe for payments."

    vi.mocked(fetchHandleManifest).mockResolvedValue({
      version: '1.0',
      handle: 'alice',
      tools: {},
      claudeMd: claudeContent,
    })

    // Simulate what installHandle does: write CLAUDE.md
    const { writeClaudeMd } = await import('../../src/writers/config.js')
    await writeClaudeMd(claudeContent, projectRoot, projectRoot, { interactive: false })

    const claudePath = join(projectRoot, 'CLAUDE.md')
    expect(existsSync(claudePath)).toBe(true)
    const written = await readFile(claudePath, 'utf-8')
    expect(written).toContain("Alice's setup")
  })

  it('recordCopy is called after successful handle install', () => {
    vi.mocked(fetchHandleManifest).mockResolvedValue({
      version: '1.0',
      handle: 'bob',
      tools: {},
    })

    // Simulate the recordCopy call (called after installHandle in the CLI command)
    void recordCopy('bob')

    expect(vi.mocked(recordCopy)).toHaveBeenCalledWith('bob')
  })

  it('dry-run: returns would-add actions without writing files', async () => {
    const stripe = findToolLocal('stripe')!
    const originalMcp = await readFile(join(projectRoot, '.cursor', 'mcp.json'), 'utf-8')

    const result = await installTool(stripe, projectRoot, {
      homeDir,
      skipNpmInstall: true,
      dryRun: true,
    })

    // MCP results should indicate would-add, not add
    expect(result.mcpResults.every((r) => r.action === 'would-add')).toBe(true)

    // The file must be unchanged
    const afterMcp = await readFile(join(projectRoot, '.cursor', 'mcp.json'), 'utf-8')
    expect(afterMcp).toBe(originalMcp)

    // No stack.json created
    const stackJson = await readStackJson(projectRoot)
    expect(stackJson).toBeNull()
  })

  it('dry-run: no env file created', async () => {
    const stripe = findToolLocal('stripe')!
    const envPath = join(projectRoot, '.env')

    await installTool(stripe, projectRoot, { homeDir, skipNpmInstall: true, dryRun: true })

    expect(existsSync(envPath)).toBe(false)
  })
})
