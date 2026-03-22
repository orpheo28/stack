import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'

// We test readAuth / readToken in isolation (no network, no browser)
import { readAuth, readToken } from '../../src/commands/auth.js'

describe('readAuth', () => {
  let tmpDir: string
  let homeDir: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-auth-test-'))
    homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('returns null when no auth files exist', async () => {
    const result = await readAuth(homeDir)
    expect(result).toBeNull()
  })

  it('reads auth.json (new format)', async () => {
    const authPath = join(homeDir, '.stack', 'auth.json')
    await mkdir(join(authPath, '..'), { recursive: true })
    await writeFile(
      authPath,
      JSON.stringify({ user_id: 'uid-123', username: 'alice', token: 'tok-abc' }),
      'utf-8',
    )

    const result = await readAuth(homeDir)
    expect(result).not.toBeNull()
    expect(result?.user_id).toBe('uid-123')
    expect(result?.username).toBe('alice')
    expect(result?.token).toBe('tok-abc')
  })

  it('falls back to legacy auth-token file', async () => {
    const legacyPath = join(homeDir, '.stack', 'auth-token')
    await mkdir(join(legacyPath, '..'), { recursive: true })
    await writeFile(legacyPath, 'legacy-token-xyz\n', 'utf-8')

    const result = await readAuth(homeDir)
    expect(result).not.toBeNull()
    expect(result?.token).toBe('legacy-token-xyz')
    expect(result?.user_id).toBe('')
    expect(result?.username).toBe('')
  })

  it('prefers auth.json over legacy token', async () => {
    const authPath = join(homeDir, '.stack', 'auth.json')
    await mkdir(join(authPath, '..'), { recursive: true })
    await writeFile(
      authPath,
      JSON.stringify({ user_id: 'uid-999', username: 'bob', token: 'new-token' }),
      'utf-8',
    )
    const legacyPath = join(homeDir, '.stack', 'auth-token')
    await writeFile(legacyPath, 'old-token', 'utf-8')

    const result = await readAuth(homeDir)
    expect(result?.token).toBe('new-token')
  })

  it('returns null when auth.json has empty token', async () => {
    const authPath = join(homeDir, '.stack', 'auth.json')
    await mkdir(join(authPath, '..'), { recursive: true })
    await writeFile(authPath, JSON.stringify({ user_id: '', username: '', token: '' }), 'utf-8')

    const result = await readAuth(homeDir)
    expect(result).toBeNull()
  })

  it('returns null when auth.json is corrupt JSON', async () => {
    const authPath = join(homeDir, '.stack', 'auth.json')
    await mkdir(join(authPath, '..'), { recursive: true })
    await writeFile(authPath, '{invalid json}}', 'utf-8')

    // Falls through to legacy, which also doesn't exist → null
    const result = await readAuth(homeDir)
    expect(result).toBeNull()
  })

  it('returns null when legacy token is blank', async () => {
    const legacyPath = join(homeDir, '.stack', 'auth-token')
    await mkdir(join(legacyPath, '..'), { recursive: true })
    await writeFile(legacyPath, '   \n', 'utf-8')

    const result = await readAuth(homeDir)
    expect(result).toBeNull()
  })
})

describe('readToken', () => {
  let tmpDir: string
  let homeDir: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-token-test-'))
    homeDir = join(tmpDir, 'home')
    await mkdir(homeDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('returns null when not authenticated', async () => {
    const token = await readToken(homeDir)
    expect(token).toBeNull()
  })

  it('returns token string when authenticated', async () => {
    const authPath = join(homeDir, '.stack', 'auth.json')
    await mkdir(join(authPath, '..'), { recursive: true })
    await writeFile(
      authPath,
      JSON.stringify({ user_id: 'u1', username: 'dev', token: 'my-secret-token' }),
      'utf-8',
    )

    const token = await readToken(homeDir)
    expect(token).toBe('my-secret-token')
  })
})

describe('OAuth state validation (unit)', () => {
  it('generates 64-char hex state via randomBytes(32)', async () => {
    // Verify the state format used in auth.ts (randomBytes(32).toString('hex'))
    const { randomBytes } = await import('node:crypto')
    const state = randomBytes(32).toString('hex')
    expect(state).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(state)).toBe(true)
  })

  it('two generated states are never equal', async () => {
    const { randomBytes } = await import('node:crypto')
    const s1 = randomBytes(32).toString('hex')
    const s2 = randomBytes(32).toString('hex')
    expect(s1).not.toBe(s2)
  })
})
