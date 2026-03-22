import type { ArtifactType } from '../types/artifact.js'
import type { McpServerConfig } from '../writers/mcp.js'
import type { EnvVar } from '../writers/env.js'
import { getRemoteTools, remoteToToolDefinition } from './remote.js'

// --- Category imports ---

import { mcpOfficial } from './categories/mcp-official.js'
import { mcpCloud } from './categories/mcp-cloud.js'
import { mcpAi } from './categories/mcp-ai.js'
import { mcpDevTools } from './categories/mcp-dev-tools.js'
import { mcpData } from './categories/mcp-data.js'
import { sdksAi } from './categories/sdks-ai.js'
import { sdksInfra } from './categories/sdks-infra.js'
import { sdksPayments } from './categories/sdks-payments.js'
import { clis } from './categories/clis.js'

// --- Types ---

export interface ToolDefinition {
  readonly name: string
  readonly displayName: string
  readonly description: string
  readonly type: ArtifactType
  readonly source: string
  readonly category?: string
  readonly mcpConfig?: McpServerConfig
  readonly envVars?: readonly EnvVar[]
  readonly sdkPackage?: string
  readonly sdkTemplate?: string
  readonly hashSha256?: string
  readonly skillFile?: string
  readonly cliCommand?: string
  readonly installMode?: 'mcp' | 'skill' | 'both'
}

// Reserved handle names — cannot be registered, checked for spoofing similarity
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  'admin',
  'stack',
  'use',
  'stripe',
  'anthropic',
  'openai',
  'vercel',
  'github',
  'supabase',
  'google',
  'microsoft',
  'meta',
  'apple',
  'claude',
  'cursor',
  'windsurf',
  'security',
  'support',
  'help',
  'api',
  'www',
  'app',
  'dev',
  'root',
  'system',
  'official',
])

// --- Registry ---

const tools: readonly ToolDefinition[] = [
  ...mcpOfficial,
  ...mcpCloud,
  ...mcpAi,
  ...mcpDevTools,
  ...mcpData,
  ...sdksAi,
  ...sdksInfra,
  ...sdksPayments,
  ...clis,
]

export const REGISTRY: ReadonlyMap<string, ToolDefinition> = new Map(tools.map((t) => [t.name, t]))

/** Sync lookup — local hardcoded registry only */
export function findToolLocal(name: string): ToolDefinition | undefined {
  return REGISTRY.get(name)
}

/** Async lookup — tries local first, then remote registry */
export async function findTool(
  name: string,
  homeDir?: string,
): Promise<ToolDefinition | undefined> {
  const local = REGISTRY.get(name)
  if (local !== undefined) return local

  try {
    const remote = await getRemoteTools(homeDir)
    const match = remote.find((t) => t.name === name)
    if (match !== undefined) return remoteToToolDefinition(match)
  } catch {
    // Remote failed — no match
  }

  return undefined
}

/** Sync search — local hardcoded registry only */
export function findSimilarToolsLocal(name: string): readonly ToolDefinition[] {
  const lower = name.toLowerCase()
  return tools.filter(
    (t) =>
      t.name.includes(lower) ||
      t.displayName.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower),
  )
}

/** Async search — local first, then augment with remote results */
export async function findSimilarTools(
  name: string,
  homeDir?: string,
): Promise<readonly ToolDefinition[]> {
  const lower = name.toLowerCase()
  const local = tools.filter(
    (t) =>
      t.name.includes(lower) ||
      t.displayName.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower),
  )

  try {
    const remote = await getRemoteTools(homeDir)
    const localNames = new Set(local.map((t) => t.name))
    const remoteMatches = remote
      .filter(
        (t) =>
          !localNames.has(t.name) &&
          (t.name.includes(lower) || t.displayName.toLowerCase().includes(lower)),
      )
      .map(remoteToToolDefinition)
    return [...local, ...remoteMatches]
  } catch {
    return local
  }
}
