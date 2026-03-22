import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWrite } from '../utils/atomic-write.js'
import { StackError } from '../types/errors.js'

// --- Types ---

export interface EnvVar {
  readonly key: string
  readonly placeholder: string
}

// --- Helpers ---

function parseExistingKeys(content: string): ReadonlySet<string> {
  const keys = new Set<string>()
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      keys.add(trimmed.substring(0, eqIndex))
    }
  }
  return keys
}

// --- Public API ---

export async function writeEnvVars(
  envFilePath: string | null,
  cwd: string,
  vars: readonly EnvVar[],
  projectRoot: string,
  homeDir?: string,
): Promise<string> {
  const targetPath = envFilePath ?? join(cwd, '.env')

  let existing = ''
  try {
    existing = await readFile(targetPath, 'utf-8')
  } catch {
    // File doesn't exist — will be created
  }

  const existingKeys = parseExistingKeys(existing)

  const newVars = vars.filter((v) => !existingKeys.has(v.key))
  if (newVars.length === 0) {
    return targetPath
  }

  const additions = newVars.map((v) => `${v.key}=${v.placeholder}`).join('\n') + '\n'

  let content = existing
  if (content.length > 0 && !content.endsWith('\n')) {
    content += '\n'
  }
  content += additions

  await atomicWrite(targetPath, content, projectRoot, {
    homeDir,
    stackDir: homeDir !== undefined ? join(homeDir, '.stack') : undefined,
    validate: (c) => {
      for (const line of c.split('\n')) {
        const trimmed = line.trim()
        if (trimmed === '' || trimmed.startsWith('#')) continue
        if (!trimmed.includes('=')) {
          throw new StackError(
            'STACK_001',
            `Invalid env line: "${trimmed}". Expected KEY=value format`,
          )
        }
      }
    },
  })

  return targetPath
}
