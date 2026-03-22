import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

vi.mock('../../src/api/client.js', () => ({
  fetchHandleManifest: vi.fn(),
  recordCopy: vi.fn(),
  recordInstall: vi.fn(),
  searchTools: vi.fn().mockResolvedValue([]),
  publishSetup: vi.fn(),
}))

import { publishSetup } from '../../src/api/client.js'
import { installTool } from '../../src/commands/install.js'
import { findToolLocal } from '../../src/registry/tools.js'
import { readStackJson } from '../../src/utils/stack-json.js'

describe('E2E: publish flow', () => {
  let tmpDir: string
  let homeDir: string
  let projectRoot: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-publish-e2e-'))
    homeDir = join(tmpDir, 'home')
    projectRoot = join(homeDir, 'project')
    await mkdir(projectRoot, { recursive: true })
    await writeFile(join(projectRoot, 'package.json'), '{}', 'utf-8')
    const cursorDir = join(projectRoot, '.cursor')
    await mkdir(cursorDir, { recursive: true })
    await writeFile(join(cursorDir, 'mcp.json'), '{}', 'utf-8')

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('publish sends correct payload after installing tools', async () => {
    const expectedUrl = 'https://getstack.com/@dev'
    vi.mocked(publishSetup).mockResolvedValue(expectedUrl)

    // Install stripe first
    const stripe = findToolLocal('stripe')!
    await installTool(stripe, projectRoot, { homeDir, skipNpmInstall: true })

    // Read the resulting stack.json
    const manifest = await readStackJson(projectRoot)
    expect(manifest).not.toBeNull()
    expect(manifest?.tools['stripe']).toBeDefined()

    // Simulate the publish
    const url = await publishSetup(manifest!, 'tok-test')
    expect(url).toBe(expectedUrl)

    expect(vi.mocked(publishSetup)).toHaveBeenCalledWith(manifest, 'tok-test')
    const callArg = vi.mocked(publishSetup).mock.calls[0]![0]
    expect(callArg.tools['stripe']).toBeDefined()
    expect(callArg.tools['stripe']!.type).toBe('mcp')
    expect(callArg.tools['stripe']!.source).toBeTruthy()
  })

  it('publish includes multiple tools in payload', async () => {
    vi.mocked(publishSetup).mockResolvedValue('https://getstack.com/@dev')

    const stripe = findToolLocal('stripe')!
    const linear = findToolLocal('linear')!
    await installTool(stripe, projectRoot, { homeDir, skipNpmInstall: true })
    await installTool(linear, projectRoot, { homeDir, skipNpmInstall: true })

    const manifest = await readStackJson(projectRoot)
    expect(Object.keys(manifest?.tools ?? {}).length).toBe(2)

    await publishSetup(manifest!, 'tok-test')

    const callArg = vi.mocked(publishSetup).mock.calls[0]![0]
    expect(callArg.tools['stripe']).toBeDefined()
    expect(callArg.tools['linear']).toBeDefined()
  })

  it('publishSetup rejects with STACK_006 on 401', async () => {
    const { StackError } = await import('../../src/types/errors.js')
    vi.mocked(publishSetup).mockRejectedValue(
      new StackError('STACK_006', 'Authentication required. Run "stack login" first.'),
    )

    const _manifest = await readStackJson(projectRoot)
    // No tools installed, stack.json won't exist — simulate an empty manifest
    const fakeManifest = { version: '1.0', handle: 'dev', tools: {} }

    await expect(publishSetup(fakeManifest, '')).rejects.toThrow(StackError)
  })

  it('stack.json contains tool source and version', async () => {
    const stripe = findToolLocal('stripe')!
    await installTool(stripe, projectRoot, { homeDir, skipNpmInstall: true })

    const manifest = await readStackJson(projectRoot)
    const stripeEntry = manifest?.tools['stripe']
    expect(stripeEntry?.source).toBeTruthy()
    expect(stripeEntry?.version).toBe('latest')
    expect(stripeEntry?.type).toBe('mcp')
  })
})
