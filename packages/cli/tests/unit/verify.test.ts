import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, rm } from 'node:fs/promises'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import {
  computeHash,
  computeFileHash,
  assertIntegrity,
  verifyFileIntegrity,
} from '../../src/security/verify.js'
import { isStackError } from '../../src/types/errors.js'

describe('computeHash', () => {
  it('should compute SHA256 of known content', () => {
    const data = Buffer.from('hello world', 'utf-8')
    // Known SHA256 of "hello world"
    const expected = createHash('sha256').update(data).digest('hex')
    const result = computeHash(data)
    expect(result).toBe(expected)
  })

  it('should compute SHA256 of empty buffer', () => {
    const data = Buffer.alloc(0)
    // Known SHA256 of empty string
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    const result = computeHash(data)
    expect(result).toBe(expected)
  })

  it('should return lowercase hex', () => {
    const result = computeHash(Buffer.from('test'))
    expect(result).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('computeFileHash', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-verify-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should compute hash of a file', async () => {
    const filePath = join(tmpDir, 'test.txt')
    const content = 'file content for hashing'
    await writeFile(filePath, content, 'utf-8')

    const result = await computeFileHash(filePath)
    const expected = createHash('sha256').update(Buffer.from(content, 'utf-8')).digest('hex')
    expect(result).toBe(expected)
  })

  it('should throw for non-existent file', async () => {
    const filePath = join(tmpDir, 'nonexistent.txt')
    await expect(computeFileHash(filePath)).rejects.toThrow()
  })
})

describe('assertIntegrity', () => {
  it('should pass when hashes match', () => {
    const hash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    expect(() => {
      assertIntegrity(hash, hash, 'test-package')
    }).not.toThrow()
  })

  it('should throw STACK_003 when hashes differ', () => {
    try {
      assertIntegrity(
        'aaaa000000000000000000000000000000000000000000000000000000000000',
        'bbbb000000000000000000000000000000000000000000000000000000000000',
        'malicious-package',
      )
      expect.fail('Should have thrown')
    } catch (error: unknown) {
      expect(isStackError(error)).toBe(true)
      if (isStackError(error)) {
        expect(error.code).toBe('STACK_003')
        expect(error.suggestion).toContain('malicious-package')
      }
    }
  })

  it('should be case-insensitive (normalizes to lowercase)', () => {
    const lower = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    const upper = 'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890'
    expect(() => {
      assertIntegrity(lower, upper, 'test')
    }).not.toThrow()
  })
})

describe('verifyFileIntegrity', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-verify-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should pass when file hash matches expected', async () => {
    const filePath = join(tmpDir, 'package.tar.gz')
    const content = 'package-content-bytes'
    await writeFile(filePath, content, 'utf-8')

    const expectedHash = createHash('sha256').update(Buffer.from(content, 'utf-8')).digest('hex')

    await expect(verifyFileIntegrity(filePath, expectedHash)).resolves.toBeUndefined()
  })

  it('should throw STACK_003 when file hash does not match', async () => {
    const filePath = join(tmpDir, 'tampered.tar.gz')
    await writeFile(filePath, 'original-content', 'utf-8')

    const fakeHash = '0000000000000000000000000000000000000000000000000000000000000000'

    try {
      await verifyFileIntegrity(filePath, fakeHash)
      expect.fail('Should have thrown')
    } catch (error: unknown) {
      expect(isStackError(error)).toBe(true)
      if (isStackError(error)) {
        expect(error.code).toBe('STACK_003')
      }
    }
  })
})
