import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { atomicWrite } from '../../src/utils/atomic-write.js'
import { isStackError } from '../../src/types/errors.js'

describe('atomicWrite', () => {
  let tmpDir: string
  let homeDir: string
  let stackDir: string
  let projectRoot: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-atomic-test-'))
    homeDir = join(tmpDir, 'home')
    stackDir = join(homeDir, '.stack')
    projectRoot = join(homeDir, 'project')
    await mkdir(projectRoot, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  const opts = (): { stackDir: string; homeDir: string } => ({ stackDir, homeDir })

  it('should write content to the file', async () => {
    const filePath = join(stackDir, 'test-file.json')
    await atomicWrite(filePath, '{"hello":"world"}', projectRoot, opts())

    const content = await readFile(filePath, 'utf-8')
    expect(content).toBe('{"hello":"world"}')
  })

  it('should create a backup before writing to an existing file', async () => {
    const filePath = join(stackDir, 'existing.json')
    await mkdir(join(filePath, '..'), { recursive: true })
    await writeFile(filePath, 'original', 'utf-8')

    const record = await atomicWrite(filePath, 'updated', projectRoot, opts())

    expect(record.type).toBe('modified')
    expect(existsSync(record.backupPath)).toBe(true)
    const backupContent = await readFile(record.backupPath, 'utf-8')
    expect(backupContent).toBe('original')
  })

  it('should record type "created" for new files', async () => {
    const filePath = join(stackDir, 'brand-new.json')

    const record = await atomicWrite(filePath, 'new content', projectRoot, opts())

    expect(record.type).toBe('created')
  })

  it('should not leave .stack.tmp files on success', async () => {
    const filePath = join(stackDir, 'clean.json')
    await atomicWrite(filePath, 'content', projectRoot, opts())

    expect(existsSync(filePath + '.stack.tmp')).toBe(false)
  })

  it('should validate content with optional validator', async () => {
    const filePath = join(stackDir, 'validated.json')

    await expect(
      atomicWrite(filePath, 'not json', projectRoot, {
        ...opts(),
        validate: (content) => {
          JSON.parse(content)
        },
      }),
    ).rejects.toThrow()

    // File should NOT exist since validation failed
    expect(existsSync(filePath)).toBe(false)
  })

  it('should pass validation for valid JSON', async () => {
    const filePath = join(stackDir, 'valid.json')

    await atomicWrite(filePath, '{"valid":true}', projectRoot, {
      ...opts(),
      validate: (content) => {
        JSON.parse(content)
      },
    })

    expect(await readFile(filePath, 'utf-8')).toBe('{"valid":true}')
  })

  it('should throw STACK_009 for paths outside whitelist', async () => {
    try {
      await atomicWrite('/etc/passwd', 'hacked', projectRoot, opts())
      expect.fail('Should have thrown')
    } catch (error: unknown) {
      expect(isStackError(error)).toBe(true)
      if (isStackError(error)) {
        expect(error.code).toBe('STACK_009')
      }
    }
  })

  it('should create parent directories if needed', async () => {
    const filePath = join(stackDir, 'deep', 'nested', 'file.json')
    await atomicWrite(filePath, 'deep content', projectRoot, opts())

    expect(await readFile(filePath, 'utf-8')).toBe('deep content')
  })
})
