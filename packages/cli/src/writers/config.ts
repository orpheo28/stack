import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { atomicWrite } from '../utils/atomic-write.js'
import { assertClaudeMdSafe } from '../security/scan.js'

// --- Types ---

export interface ConfigWriteOptions {
  readonly interactive: boolean
}

export interface ConfigWriteResult {
  readonly filePath: string
  readonly hadExisting: boolean
  readonly diff: readonly string[]
  readonly skipped: boolean
}

// --- Helpers ---

function computeSimpleDiff(oldContent: string, newContent: string): string[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const diff: string[] = []

  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === undefined && newLine !== undefined) {
      diff.push(`+ ${newLine}`)
    } else if (oldLine !== undefined && newLine === undefined) {
      diff.push(`- ${oldLine}`)
    } else if (oldLine !== newLine) {
      diff.push(`- ${oldLine ?? ''}`)
      diff.push(`+ ${newLine ?? ''}`)
    }
  }

  return diff
}

function displayDiff(diff: readonly string[], fileName: string): void {
  console.log(chalk.cyan(`\n${fileName} diff:`))
  for (const line of diff) {
    if (line.startsWith('+')) {
      console.log(chalk.green(line))
    } else if (line.startsWith('-')) {
      console.log(chalk.red(line))
    } else {
      console.log(line)
    }
  }
}

async function confirmApply(fileName: string): Promise<boolean> {
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Apply changes to ${fileName}?`,
      default: false,
    },
  ])
  return confirm
}

async function readExisting(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

// --- Public API ---

export async function writeClaudeMd(
  content: string,
  cwd: string,
  projectRoot: string,
  options: ConfigWriteOptions,
  homeDir?: string,
): Promise<ConfigWriteResult> {
  // Security scan BEFORE anything else
  assertClaudeMdSafe(content)

  const filePath = join(cwd, 'CLAUDE.md')
  const existing = await readExisting(filePath)
  const hadExisting = existing !== null
  const diff = hadExisting ? computeSimpleDiff(existing, content) : []

  // Interactive mode: show diff and ask for confirmation
  if (options.interactive && hadExisting && diff.length > 0) {
    displayDiff(diff, 'CLAUDE.md')
    const confirmed = await confirmApply('CLAUDE.md')
    if (!confirmed) {
      return { filePath, hadExisting, diff, skipped: true }
    }
  } else if (options.interactive && !hadExisting) {
    console.log(chalk.cyan(`\nNew CLAUDE.md (${content.split('\n').length.toString()} lines)`))
    const confirmed = await confirmApply('CLAUDE.md')
    if (!confirmed) {
      return { filePath, hadExisting, diff, skipped: true }
    }
  }

  await atomicWrite(filePath, content, projectRoot, {
    homeDir,
    stackDir: homeDir !== undefined ? join(homeDir, '.stack') : undefined,
  })

  return { filePath, hadExisting, diff, skipped: false }
}

export async function writeCursorRules(
  content: string,
  cwd: string,
  projectRoot: string,
  options: ConfigWriteOptions,
  homeDir?: string,
): Promise<ConfigWriteResult> {
  // Security scan BEFORE anything else (same as CLAUDE.md)
  assertClaudeMdSafe(content)

  const filePath = join(cwd, '.cursorrules')
  const existing = await readExisting(filePath)
  const hadExisting = existing !== null
  const diff = hadExisting ? computeSimpleDiff(existing, content) : []

  if (options.interactive && hadExisting && diff.length > 0) {
    displayDiff(diff, '.cursorrules')
    const confirmed = await confirmApply('.cursorrules')
    if (!confirmed) {
      return { filePath, hadExisting, diff, skipped: true }
    }
  } else if (options.interactive && !hadExisting) {
    console.log(chalk.cyan(`\nNew .cursorrules (${content.split('\n').length.toString()} lines)`))
    const confirmed = await confirmApply('.cursorrules')
    if (!confirmed) {
      return { filePath, hadExisting, diff, skipped: true }
    }
  }

  await atomicWrite(filePath, content, projectRoot, {
    homeDir,
    stackDir: homeDir !== undefined ? join(homeDir, '.stack') : undefined,
  })

  return { filePath, hadExisting, diff, skipped: false }
}
