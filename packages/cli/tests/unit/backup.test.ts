import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, rm, readFile } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createBackup,
  restoreBackup,
  listBackups,
  rollbackLast,
} from '../../src/security/backup.js'

describe('createBackup', () => {
  let tmpDir: string
  let stackDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-backup-test-'))
    stackDir = join(tmpDir, '.stack')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should create a backup of an existing file', async () => {
    const original = join(tmpDir, 'config.json')
    await writeFile(original, '{"key":"value"}', 'utf-8')

    const record = await createBackup(original, stackDir)

    expect(record.originalPath).toBe(original)
    expect(record.type).toBe('modified')
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(existsSync(record.backupPath)).toBe(true)

    const backupContent = await readFile(record.backupPath, 'utf-8')
    expect(backupContent).toBe('{"key":"value"}')
  })

  it('should record type "created" for non-existent files', async () => {
    const newFile = join(tmpDir, 'new-file.json')

    const record = await createBackup(newFile, stackDir)

    expect(record.type).toBe('created')
    expect(record.originalPath).toBe(newFile)
    expect(record.backupPath).toBe('')
  })

  it('should create the backups directory if missing', async () => {
    const original = join(tmpDir, 'file.txt')
    await writeFile(original, 'hello', 'utf-8')

    await createBackup(original, stackDir)

    expect(existsSync(join(stackDir, 'backups'))).toBe(true)
  })

  it('should produce unique backup filenames for same file', async () => {
    const original = join(tmpDir, 'data.json')
    await writeFile(original, 'v1', 'utf-8')

    const record1 = await createBackup(original, stackDir)

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 5))
    await writeFile(original, 'v2', 'utf-8')
    const record2 = await createBackup(original, stackDir)

    expect(record1.backupPath).not.toBe(record2.backupPath)
  })

  it('should append record to the manifest', async () => {
    const file1 = join(tmpDir, 'a.txt')
    const file2 = join(tmpDir, 'b.txt')
    await writeFile(file1, 'aaa', 'utf-8')
    await writeFile(file2, 'bbb', 'utf-8')

    await createBackup(file1, stackDir)
    await createBackup(file2, stackDir)

    const records = await listBackups(stackDir)
    expect(records.length).toBe(2)
  })
})

describe('restoreBackup', () => {
  let tmpDir: string
  let stackDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-backup-test-'))
    stackDir = join(tmpDir, '.stack')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should restore a modified file to its original content', async () => {
    const original = join(tmpDir, 'config.json')
    await writeFile(original, 'original-content', 'utf-8')

    const record = await createBackup(original, stackDir)

    // Modify the file
    await writeFile(original, 'modified-content', 'utf-8')
    expect(await readFile(original, 'utf-8')).toBe('modified-content')

    // Restore
    await restoreBackup(record)
    expect(await readFile(original, 'utf-8')).toBe('original-content')
  })

  it('should delete a file that was created (rollback creation)', async () => {
    const newFile = join(tmpDir, 'created-file.txt')

    const record = await createBackup(newFile, stackDir)

    // Simulate that the file was created after backup
    await writeFile(newFile, 'new content', 'utf-8')
    expect(existsSync(newFile)).toBe(true)

    // Restore should delete the file
    await restoreBackup(record)
    expect(existsSync(newFile)).toBe(false)
  })
})

describe('listBackups', () => {
  let tmpDir: string
  let stackDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-backup-test-'))
    stackDir = join(tmpDir, '.stack')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should return empty array when no backups exist', async () => {
    const records = await listBackups(stackDir)
    expect(records).toEqual([])
  })

  it('should return records sorted newest first', async () => {
    const file = join(tmpDir, 'data.json')
    await writeFile(file, 'v1', 'utf-8')
    await createBackup(file, stackDir)

    await new Promise((resolve) => setTimeout(resolve, 5))
    await writeFile(file, 'v2', 'utf-8')
    await createBackup(file, stackDir)

    const records = await listBackups(stackDir)
    expect(records.length).toBe(2)
    // Newest first
    expect(records[0]?.timestamp >= (records[1]?.timestamp ?? '')).toBe(true)
  })
})

describe('rollbackLast', () => {
  let tmpDir: string
  let stackDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-backup-test-'))
    stackDir = join(tmpDir, '.stack')
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should restore the most recent backup', async () => {
    const file = join(tmpDir, 'rollback-test.txt')
    await writeFile(file, 'original', 'utf-8')
    await createBackup(file, stackDir)

    await writeFile(file, 'changed', 'utf-8')
    expect(await readFile(file, 'utf-8')).toBe('changed')

    const record = await rollbackLast(stackDir)
    expect(await readFile(file, 'utf-8')).toBe('original')
    expect(record.originalPath).toBe(file)
  })

  it('should throw when no backups exist', async () => {
    await expect(rollbackLast(stackDir)).rejects.toThrow()
  })
})
