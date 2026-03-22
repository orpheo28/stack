import { writeFile, readFile, rename, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { assertPathAllowed } from '../security/whitelist.js'
import { createBackup } from '../security/backup.js'
import type { BackupRecord } from '../security/backup.js'

export type ContentValidator = (content: string) => void

export interface AtomicWriteOptions {
  readonly stackDir?: string
  readonly homeDir?: string
  readonly validate?: ContentValidator
}

export async function atomicWrite(
  filePath: string,
  content: string,
  projectRoot: string,
  options?: AtomicWriteOptions,
): Promise<BackupRecord> {
  // 1. Whitelist check
  assertPathAllowed(filePath, projectRoot, options?.homeDir)

  // 2. Backup before modification
  const record = await createBackup(filePath, options?.stackDir)

  const tmpPath = filePath + '.stack.tmp'

  try {
    // 3. Ensure parent directory exists
    await mkdir(join(filePath, '..'), { recursive: true })

    // 4. Write to tmp file
    await writeFile(tmpPath, content, 'utf-8')

    // 5. Validate content if validator provided
    if (options?.validate !== undefined) {
      const tmpContent = await readFile(tmpPath, 'utf-8')
      options.validate(tmpContent)
    }

    // 6. Atomic rename
    await rename(tmpPath, filePath)

    // 7. Post-verify
    const written = await readFile(filePath, 'utf-8')
    if (written !== content) {
      throw new Error('Post-write verification failed: content mismatch')
    }
  } catch (error) {
    // Cleanup tmp file on failure
    try {
      await rm(tmpPath, { force: true })
    } catch {
      // Ignore cleanup errors
    }
    throw error
  }

  return record
}
