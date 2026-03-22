import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm, chmod } from 'node:fs/promises'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, platform } from 'node:os'
import { detectContext, getClaudeDesktopConfigPath } from '../../src/detectors/context.js'
import type { DetectedClient } from '../../src/detectors/context.js'

async function createFile(filePath: string, content: string = ''): Promise<void> {
  await mkdir(join(filePath, '..'), { recursive: true })
  await writeFile(filePath, content, 'utf-8')
}

function findClient(clients: readonly DetectedClient[], name: string): DetectedClient | undefined {
  return clients.find((c) => c.name === name)
}

describe('getClaudeDesktopConfigPath', () => {
  it('should return a path ending with claude_desktop_config.json', () => {
    const configPath = getClaudeDesktopConfigPath()
    expect(configPath).toMatch(/claude_desktop_config\.json$/)
  })

  it('should use Library/Application Support on macOS', () => {
    if (platform() !== 'darwin') return
    const configPath = getClaudeDesktopConfigPath()
    expect(configPath).toContain('Library/Application Support/Claude')
  })

  it('should use .config/claude on Linux', () => {
    if (platform() !== 'linux') return
    const configPath = getClaudeDesktopConfigPath()
    expect(configPath).toContain('.config/claude')
  })

  it('should respect custom homeDir parameter', () => {
    const configPath = getClaudeDesktopConfigPath('/fake/home')
    expect(configPath).toContain('/fake/home')
    expect(configPath).toMatch(/claude_desktop_config\.json$/)
  })
})

describe('detectContext — Tier 1: claude-desktop', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect claude-desktop when config file exists', async () => {
    const homeDir = join(tmpDir, 'home')
    const configPath = getClaudeDesktopConfigPath(homeDir)
    await createFile(configPath, '{}')

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'claude-desktop')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(1)
    expect(client?.certainty).toBe('confirmed')
    expect(client?.configPath).toBe(configPath)
  })

  it('should not detect claude-desktop when config is absent', async () => {
    const homeDir = join(tmpDir, 'empty-home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'claude-desktop')
    expect(client).toBeUndefined()
  })
})

describe('detectContext — Tier 1: cursor', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect cursor when .cursor/mcp.json exists in cwd', async () => {
    await createFile(join(tmpDir, '.cursor', 'mcp.json'), '{}')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'cursor')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(1)
    expect(client?.configPath).toBe(join(tmpDir, '.cursor', 'mcp.json'))
  })

  it('should walk up parents to find .cursor/mcp.json', async () => {
    await createFile(join(tmpDir, '.cursor', 'mcp.json'), '{}')
    const deepDir = join(tmpDir, 'a', 'b', 'c')
    await mkdir(deepDir, { recursive: true })
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(deepDir, homeDir)
    const client = findClient(ctx.clients, 'cursor')
    expect(client).toBeDefined()
    expect(client?.configPath).toBe(join(tmpDir, '.cursor', 'mcp.json'))
  })
})

describe('detectContext — Tier 1: vscode', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect vscode when .vscode/mcp.json exists in cwd', async () => {
    await createFile(join(tmpDir, '.vscode', 'mcp.json'), '{}')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'vscode')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(1)
    expect(client?.certainty).toBe('confirmed')
  })
})

describe('detectContext — Tier 1: windsurf', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect windsurf when .windsurfrules exists', async () => {
    await createFile(join(tmpDir, '.windsurfrules'), '')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'windsurf')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(1)
  })

  it('should walk up parents for windsurf', async () => {
    await createFile(join(tmpDir, '.windsurfrules'), '')
    const deepDir = join(tmpDir, 'sub', 'dir')
    await mkdir(deepDir, { recursive: true })
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(deepDir, homeDir)
    const client = findClient(ctx.clients, 'windsurf')
    expect(client).toBeDefined()
  })
})

describe('detectContext — Tier 2: claude-code', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect claude-code when CLAUDE.md exists', async () => {
    await createFile(join(tmpDir, 'CLAUDE.md'), '# Instructions')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'claude-code')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(2)
    expect(client?.certainty).toBe('confirmed')
  })

  it('should walk up parents for CLAUDE.md', async () => {
    await createFile(join(tmpDir, 'CLAUDE.md'), '# Instructions')
    const deepDir = join(tmpDir, 'nested', 'deep')
    await mkdir(deepDir, { recursive: true })
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(deepDir, homeDir)
    const client = findClient(ctx.clients, 'claude-code')
    expect(client).toBeDefined()
  })
})

describe('detectContext — Tier 2: codex', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect codex when AGENTS.md exists', async () => {
    await createFile(join(tmpDir, 'AGENTS.md'), '# Agents')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'codex')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(2)
  })
})

describe('detectContext — Tier 2: opencode', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect opencode via opencode.json', async () => {
    await createFile(join(tmpDir, 'opencode.json'), '{}')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'opencode')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(2)
  })

  it('should detect opencode via .opencode/config.json', async () => {
    await createFile(join(tmpDir, '.opencode', 'config.json'), '{}')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'opencode')
    expect(client).toBeDefined()
  })
})

describe('detectContext — Tier 3: openclaw', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect openclaw from home dir config', async () => {
    const homeDir = join(tmpDir, 'home')
    await createFile(join(homeDir, '.openclaw', 'config.json'), '{}')

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'openclaw')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(3)
    expect(client?.certainty).toBe('probable')
  })
})

describe('detectContext — Tier 3: continue', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect continue when .continue/config.json exists', async () => {
    await createFile(join(tmpDir, '.continue', 'config.json'), '{}')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'continue')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(3)
    expect(client?.certainty).toBe('probable')
  })
})

describe('detectContext — Tier 3: zed', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect zed from home dir config', async () => {
    const homeDir = join(tmpDir, 'home')
    await createFile(join(homeDir, '.config', 'zed', 'settings.json'), '{}')

    const ctx = await detectContext(tmpDir, homeDir)
    const client = findClient(ctx.clients, 'zed')
    expect(client).toBeDefined()
    expect(client?.tier).toBe(3)
    expect(client?.certainty).toBe('probable')
  })
})

describe('detectContext — multi-client detection', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should return multiple clients when multiple configs exist', async () => {
    const homeDir = join(tmpDir, 'home')
    await createFile(join(tmpDir, '.cursor', 'mcp.json'), '{}')
    await createFile(join(tmpDir, '.vscode', 'mcp.json'), '{}')
    await createFile(join(tmpDir, 'CLAUDE.md'), '# Hi')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.clients.length).toBeGreaterThanOrEqual(3)
    expect(findClient(ctx.clients, 'cursor')).toBeDefined()
    expect(findClient(ctx.clients, 'vscode')).toBeDefined()
    expect(findClient(ctx.clients, 'claude-code')).toBeDefined()
  })

  it('should sort clients by tier', async () => {
    const homeDir = join(tmpDir, 'home')
    await createFile(join(tmpDir, 'CLAUDE.md'), '# Hi')
    await createFile(join(tmpDir, '.cursor', 'mcp.json'), '{}')
    await createFile(join(tmpDir, '.continue', 'config.json'), '{}')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    const tiers = ctx.clients.map((c) => c.tier)
    const sorted = [...tiers].sort((a, b) => a - b)
    expect(tiers).toEqual(sorted)
  })
})

describe('detectContext — project type', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect node project via package.json', async () => {
    await createFile(join(tmpDir, 'package.json'), '{}')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.projectType).toBe('node')
  })

  it('should detect python project via pyproject.toml', async () => {
    await createFile(join(tmpDir, 'pyproject.toml'), '')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.projectType).toBe('python')
  })

  it('should detect python project via requirements.txt', async () => {
    await createFile(join(tmpDir, 'requirements.txt'), '')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.projectType).toBe('python')
  })

  it('should prefer node over python when both exist', async () => {
    await createFile(join(tmpDir, 'package.json'), '{}')
    await createFile(join(tmpDir, 'pyproject.toml'), '')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.projectType).toBe('node')
  })

  it('should return unknown when no project files found', async () => {
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.projectType).toBe('unknown')
  })
})

describe('detectContext — env file', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should detect .env file', async () => {
    await createFile(join(tmpDir, '.env'), 'KEY=value')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.envFilePath).toBe(join(tmpDir, '.env'))
  })

  it('should detect .env.local when .env is absent', async () => {
    await createFile(join(tmpDir, '.env.local'), 'KEY=value')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.envFilePath).toBe(join(tmpDir, '.env.local'))
  })

  it('should prefer .env over .env.local', async () => {
    await createFile(join(tmpDir, '.env'), 'A=1')
    await createFile(join(tmpDir, '.env.local'), 'B=2')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.envFilePath).toBe(join(tmpDir, '.env'))
  })

  it('should return null when no env file exists', async () => {
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.envFilePath).toBeNull()
  })
})

describe('detectContext — error resilience', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should handle EACCES gracefully', async () => {
    if (platform() === 'win32') return

    const file = join(tmpDir, '.env')
    await createFile(file, 'SECRET=x')
    await chmod(file, 0o000)

    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    // Should not throw, env file treated as not found
    expect(ctx.envFilePath).toBeNull()

    // Restore permissions for cleanup
    await chmod(file, 0o644)
  })

  it('should return empty context for non-existent cwd', async () => {
    const nonExistent = join(tmpDir, 'does', 'not', 'exist')
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(nonExistent, homeDir)
    expect(ctx.clients).toEqual([])
    expect(ctx.projectType).toBe('unknown')
    expect(ctx.envFilePath).toBeNull()
  })

  it('should set cwd in the result', async () => {
    const homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const ctx = await detectContext(tmpDir, homeDir)
    expect(ctx.cwd).toBe(tmpDir)
  })
})

describe('detectContext — walk-up boundaries', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should not walk above homeDir', async () => {
    // Place .cursor/mcp.json ABOVE the homeDir
    const homeDir = join(tmpDir, 'users', 'dev')
    await mkdir(homeDir, { recursive: true })
    await createFile(join(tmpDir, '.cursor', 'mcp.json'), '{}')

    const projectDir = join(homeDir, 'projects', 'my-app')
    await mkdir(projectDir, { recursive: true })

    const ctx = await detectContext(projectDir, homeDir)
    const client = findClient(ctx.clients, 'cursor')
    // Should NOT find cursor because .cursor/mcp.json is above homeDir
    expect(client).toBeUndefined()
  })
})
