import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeEnvVars } from '../../src/writers/env.js'
import type { EnvVar } from '../../src/writers/env.js'

describe('writeEnvVars', () => {
  let tmpDir: string
  let homeDir: string
  let projectRoot: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-env-test-'))
    homeDir = join(tmpDir, 'home')
    projectRoot = join(homeDir, 'project')
    await mkdir(projectRoot, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  const vars: readonly EnvVar[] = [
    { key: 'STRIPE_API_KEY', placeholder: '<your-stripe-key-here>' },
    { key: 'DATABASE_URL', placeholder: '<your-database-url>' },
  ]

  it('should create .env file when none exists', async () => {
    const result = await writeEnvVars(null, projectRoot, vars, projectRoot, homeDir)

    expect(result).toBe(join(projectRoot, '.env'))
    expect(existsSync(result)).toBe(true)

    const content = await readFile(result, 'utf-8')
    expect(content).toContain('STRIPE_API_KEY=<your-stripe-key-here>')
    expect(content).toContain('DATABASE_URL=<your-database-url>')
  })

  it('should append to existing .env file', async () => {
    const envPath = join(projectRoot, '.env')
    await writeFile(envPath, 'EXISTING_VAR=value\n', 'utf-8')

    await writeEnvVars(envPath, projectRoot, vars, projectRoot, homeDir)

    const content = await readFile(envPath, 'utf-8')
    expect(content).toContain('EXISTING_VAR=value')
    expect(content).toContain('STRIPE_API_KEY=<your-stripe-key-here>')
  })

  it('should not overwrite existing env vars', async () => {
    const envPath = join(projectRoot, '.env')
    await writeFile(envPath, 'STRIPE_API_KEY=sk_real_key_123\n', 'utf-8')

    await writeEnvVars(envPath, projectRoot, vars, projectRoot, homeDir)

    const content = await readFile(envPath, 'utf-8')
    expect(content).toContain('STRIPE_API_KEY=sk_real_key_123')
    // Should NOT contain the placeholder since the key already exists
    expect(content).not.toContain('<your-stripe-key-here>')
    // Should add DATABASE_URL since it's new
    expect(content).toContain('DATABASE_URL=<your-database-url>')
  })

  it('should handle .env.local path', async () => {
    const envLocalPath = join(projectRoot, '.env.local')
    await writeFile(envLocalPath, '', 'utf-8')

    const result = await writeEnvVars(envLocalPath, projectRoot, vars, projectRoot, homeDir)

    expect(result).toBe(envLocalPath)
    const content = await readFile(envLocalPath, 'utf-8')
    expect(content).toContain('STRIPE_API_KEY=')
  })

  it('should add newline before appending if file does not end with one', async () => {
    const envPath = join(projectRoot, '.env')
    await writeFile(envPath, 'A=1', 'utf-8') // no trailing newline

    await writeEnvVars(envPath, projectRoot, [{ key: 'B', placeholder: '2' }], projectRoot, homeDir)

    const content = await readFile(envPath, 'utf-8')
    expect(content).toBe('A=1\nB=2\n')
  })

  it('should return the path of the written file', async () => {
    const result = await writeEnvVars(null, projectRoot, vars, projectRoot, homeDir)
    expect(typeof result).toBe('string')
    expect(result).toMatch(/\.env$/)
  })
})
