import { createHash, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { StackError } from '../types/errors.js'

export function computeHash(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

export async function computeFileHash(filePath: string): Promise<string> {
  const data = await readFile(filePath)
  return computeHash(data)
}

export function assertIntegrity(actual: string, expected: string, label: string): void {
  const normalizedActual = actual.toLowerCase()
  const normalizedExpected = expected.toLowerCase()

  const actualBuf = Buffer.from(normalizedActual, 'utf-8')
  const expectedBuf = Buffer.from(normalizedExpected, 'utf-8')

  // Length check first — timingSafeEqual requires equal-length buffers
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    throw new StackError(
      'STACK_003',
      `Integrity check failed for "${label}". Expected hash: ${normalizedExpected}, got: ${normalizedActual}. Install aborted. Report to security@use.dev if unexpected.`,
    )
  }
}

export async function verifyFileIntegrity(filePath: string, expectedHash: string): Promise<void> {
  const actualHash = await computeFileHash(filePath)
  assertIntegrity(actualHash, expectedHash, filePath)
}
