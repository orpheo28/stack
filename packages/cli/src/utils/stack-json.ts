import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWrite } from './atomic-write.js'
import type { StackJson, ArtifactConfig } from '../types/artifact.js'

const STACK_JSON_VERSION = '1.0'

export async function readStackJson(cwd: string): Promise<StackJson | null> {
  try {
    const raw = await readFile(join(cwd, 'stack.json'), 'utf-8')
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed && 'tools' in parsed) {
      return parsed as StackJson
    }

    return null
  } catch {
    return null
  }
}

export async function addToolToStackJson(
  cwd: string,
  toolName: string,
  config: ArtifactConfig,
  homeDir?: string,
): Promise<void> {
  const existing = await readStackJson(cwd)

  const manifest: Record<string, unknown> =
    existing !== null
      ? { ...existing, tools: { ...existing.tools } }
      : { version: STACK_JSON_VERSION, tools: {} }

  const tools = manifest['tools'] as Record<string, ArtifactConfig>
  tools[toolName] = config

  const content = JSON.stringify(manifest, null, 2) + '\n'

  await atomicWrite(join(cwd, 'stack.json'), content, cwd, {
    homeDir,
    stackDir: homeDir !== undefined ? join(homeDir, '.stack') : undefined,
    validate: (c) => {
      JSON.parse(c)
    },
  })
}
