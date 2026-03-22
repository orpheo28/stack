import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { z } from 'zod'
import type { ToolDefinition } from './tools.js'

// --- Types ---

const RemoteToolSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  type: z.string(),
  source: z.string(),
  description: z.string(),
  installs: z.number(),
})

const RemoteToolsResponseSchema = z.array(RemoteToolSchema)

interface CacheData {
  readonly fetchedAt: number
  readonly tools: readonly RemoteToolEntry[]
}

interface RemoteToolEntry {
  readonly name: string
  readonly displayName: string
  readonly type: string
  readonly source: string
  readonly description: string
  readonly installs: number
}

// --- Config ---

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const DEFAULT_API_URL = 'https://getstack.com/api'

function getApiUrl(): string {
  return process.env['STACK_API_URL'] ?? DEFAULT_API_URL
}

function getCachePath(home?: string): string {
  return join(home ?? homedir(), '.stack', 'cache', 'registry.json')
}

// --- Cache ---

async function readCache(home?: string): Promise<CacheData | null> {
  const cachePath = getCachePath(home)
  if (!existsSync(cachePath)) return null

  try {
    const raw = await readFile(cachePath, 'utf-8')
    const data = JSON.parse(raw) as CacheData
    if (typeof data.fetchedAt !== 'number' || !Array.isArray(data.tools)) return null
    return data
  } catch {
    return null
  }
}

async function writeCache(tools: readonly RemoteToolEntry[], home?: string): Promise<void> {
  const cachePath = getCachePath(home)
  const tmpPath = cachePath + '.tmp'
  await mkdir(join(cachePath, '..'), { recursive: true })
  const data: CacheData = { fetchedAt: Date.now(), tools }
  await writeFile(tmpPath, JSON.stringify(data), 'utf-8')
  await rename(tmpPath, cachePath)
}

function isCacheValid(cache: CacheData): boolean {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS
}

// --- Fetch ---

async function fetchRemoteTools(): Promise<readonly RemoteToolEntry[]> {
  const url = `${getApiUrl()}/tools`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'usedev-cli' },
  })

  if (!response.ok) return []

  const data: unknown = await response.json()
  const parsed = RemoteToolsResponseSchema.safeParse(data)
  return parsed.success ? parsed.data : []
}

// --- Public API ---

/**
 * Fetches the full remote tool list with caching.
 * Returns empty array if both cache and remote fail.
 */
export async function getRemoteTools(home?: string): Promise<readonly RemoteToolEntry[]> {
  // Check cache first
  const cache = await readCache(home)
  if (cache !== null && isCacheValid(cache)) {
    return cache.tools
  }

  // Fetch fresh data
  try {
    const tools = await fetchRemoteTools()
    if (tools.length > 0) {
      await writeCache(tools, home)
    }
    return tools
  } catch {
    // Offline — return stale cache if available
    return cache?.tools ?? []
  }
}

/**
 * Converts a remote tool entry to a ToolDefinition usable by writers.
 * Remote tools have less config detail than hardcoded ones,
 * so they rely on convention-based defaults.
 */
export function remoteToToolDefinition(entry: RemoteToolEntry): ToolDefinition {
  const type = entry.type as ToolDefinition['type']
  const base = {
    name: entry.name,
    displayName: entry.displayName,
    description: entry.description,
    type,
    source: entry.source,
  }

  // Convention: MCP tools from npm use npx
  if (type === 'mcp' && entry.source.startsWith('npm:')) {
    const pkg = entry.source.replace('npm:', '')
    return {
      ...base,
      mcpConfig: { command: 'npx', args: ['-y', pkg] },
    }
  }

  // Convention: SDK tools from npm install the package
  if (type === 'sdk' && entry.source.startsWith('npm:')) {
    const pkg = entry.source.replace('npm:', '')
    return {
      ...base,
      sdkPackage: pkg,
    }
  }

  return base
}
