import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeSdkSetup } from '../../src/writers/sdk.js'

describe('writeSdkSetup', () => {
  let tmpDir: string
  let homeDir: string
  let projectRoot: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-sdk-test-'))
    homeDir = join(tmpDir, 'home')
    projectRoot = join(homeDir, 'project')
    await mkdir(join(projectRoot, 'src', 'lib'), { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  const template = `import Stripe from 'stripe'\n\nexport const stripe = new Stripe(process.env.STRIPE_API_KEY!)\n`

  it('should generate the SDK template file', async () => {
    const result = await writeSdkSetup('stripe', template, projectRoot, undefined, homeDir, true)

    const filePath = join(projectRoot, 'src', 'lib', 'stripe.ts')
    expect(existsSync(filePath)).toBe(true)
    expect(result.templatePath).toBe(filePath)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toBe(template)
  })

  it('should create src/lib directory if missing', async () => {
    const freshProject = join(homeDir, 'fresh-project')
    await mkdir(freshProject, { recursive: true })

    await writeSdkSetup('stripe', template, freshProject, undefined, homeDir, true)

    expect(existsSync(join(freshProject, 'src', 'lib', 'stripe.ts'))).toBe(true)
  })

  it('should use the tool name as filename', async () => {
    await writeSdkSetup('supabase', 'export const sb = {}', projectRoot, undefined, homeDir, true)

    expect(existsSync(join(projectRoot, 'src', 'lib', 'supabase.ts'))).toBe(true)
  })

  it('should report packageInstalled false when no sdkPackage provided', async () => {
    const result = await writeSdkSetup('stripe', template, projectRoot, undefined, homeDir, true)
    expect(result.packageInstalled).toBe(false)
  })

  it('should report packageInstalled false when skipNpmInstall is true', async () => {
    const result = await writeSdkSetup('stripe', template, projectRoot, 'stripe', homeDir, true)
    expect(result.packageInstalled).toBe(false)
    // Template still generated
    expect(existsSync(join(projectRoot, 'src', 'lib', 'stripe.ts'))).toBe(true)
  })

  it('should reject invalid package names (command injection protection)', async () => {
    await expect(
      writeSdkSetup('evil', template, projectRoot, 'pkg; rm -rf /', homeDir),
    ).rejects.toThrow('Invalid package name')
  })
})
