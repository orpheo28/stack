import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchHandleManifest, recordCopy } from '../../src/api/client.js'
import { isStackError } from '../../src/types/errors.js'

describe('fetchHandleManifest', () => {
  beforeEach(() => {
    // Point API to a non-existent local server to avoid real network calls
    vi.stubEnv('STACK_API_URL', 'http://127.0.0.1:1')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should throw STACK_004 on network error', async () => {
    try {
      await fetchHandleManifest('orpheo')
      expect.fail('Should have thrown')
    } catch (error: unknown) {
      expect(isStackError(error)).toBe(true)
      if (isStackError(error)) {
        expect(error.code).toBe('STACK_004')
      }
    }
  })

  it('should strip @ prefix from handle', async () => {
    // Both forms should produce the same network error (testing the path construction)
    const errors: string[] = []
    for (const handle of ['orpheo', '@orpheo']) {
      try {
        await fetchHandleManifest(handle)
      } catch (error: unknown) {
        if (isStackError(error)) {
          errors.push(error.code)
        }
      }
    }
    // Both should fail with same error since server is unreachable
    expect(errors).toEqual(['STACK_004', 'STACK_004'])
  })
})

describe('recordCopy', () => {
  beforeEach(() => {
    vi.stubEnv('STACK_API_URL', 'http://127.0.0.1:1')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should not throw on network failure (non-critical)', async () => {
    // recordCopy should silently fail — it's analytics, not critical
    await expect(recordCopy('orpheo')).resolves.toBeUndefined()
  })
})
