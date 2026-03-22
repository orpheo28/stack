import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
  rename,
  rm,
  access,
  constants,
} from 'node:fs/promises'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { StackError } from '../types/errors.js'

// --- Types ---

export interface BackupRecord {
  readonly originalPath: string
  readonly backupPath: string
  readonly timestamp: string
  readonly type: 'modified' | 'created'
}

interface BackupManifest {
  records: BackupRecord[]
}

// --- Helpers ---

function getBackupsDir(stackDir: string): string {
  return join(stackDir, 'backups')
}

function getManifestPath(stackDir: string): string {
  return join(stackDir, 'backup-manifest.json')
}

function defaultStackDir(): string {
  return join(homedir(), '.stack')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch {
    return false
  }
}

async function readManifest(stackDir: string): Promise<BackupManifest> {
  const manifestPath = getManifestPath(stackDir)
  if (!(await fileExists(manifestPath))) {
    return { records: [] }
  }

  try {
    const raw = await readFile(manifestPath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'records' in parsed &&
      Array.isArray((parsed as Record<string, unknown>).records)
    ) {
      return parsed as BackupManifest
    }

    return { records: [] }
  } catch {
    return { records: [] }
  }
}

async function writeManifest(stackDir: string, manifest: BackupManifest): Promise<void> {
  const manifestPath = getManifestPath(stackDir)
  const tmpPath = manifestPath + '.stack.tmp'

  await mkdir(join(manifestPath, '..'), { recursive: true })
  await writeFile(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8')
  await rename(tmpPath, manifestPath)
}

// --- Public API ---

export async function createBackup(filePath: string, stackDir?: string): Promise<BackupRecord> {
  const resolvedStackDir = stackDir ?? defaultStackDir()
  const backupsDir = getBackupsDir(resolvedStackDir)
  await mkdir(backupsDir, { recursive: true })

  const timestamp = new Date().toISOString()
  const exists = await fileExists(filePath)

  let record: BackupRecord

  if (exists) {
    const backupFileName = `${basename(filePath)}.${timestamp}.bak`
    const backupPath = join(backupsDir, backupFileName)
    await copyFile(filePath, backupPath)

    record = {
      originalPath: filePath,
      backupPath,
      timestamp,
      type: 'modified',
    }
  } else {
    record = {
      originalPath: filePath,
      backupPath: '',
      timestamp,
      type: 'created',
    }
  }

  const manifest = await readManifest(resolvedStackDir)
  manifest.records.push(record)
  await writeManifest(resolvedStackDir, manifest)

  return record
}

export async function restoreBackup(record: BackupRecord): Promise<void> {
  if (record.type === 'modified') {
    if (!(await fileExists(record.backupPath))) {
      throw new StackError(
        'STACK_006',
        `Backup file not found: ${record.backupPath}. Cannot restore.`,
      )
    }
    await copyFile(record.backupPath, record.originalPath)
  } else {
    // type === 'created' — file didn't exist before, so delete it
    if (await fileExists(record.originalPath)) {
      await rm(record.originalPath)
    }
  }
}

export async function listBackups(stackDir?: string): Promise<readonly BackupRecord[]> {
  const resolvedStackDir = stackDir ?? defaultStackDir()
  const manifest = await readManifest(resolvedStackDir)

  // Sort newest first
  return [...manifest.records].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function rollbackLast(stackDir?: string): Promise<BackupRecord> {
  const records = await listBackups(stackDir)
  const latest = records[0]

  if (latest === undefined) {
    throw new StackError('STACK_006', 'No backups found. Nothing to rollback.')
  }

  await restoreBackup(latest)
  return latest
}
