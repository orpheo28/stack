import { readFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWrite } from '../utils/atomic-write.js'
import type { DetectedClient, ClientName } from '../detectors/context.js'

// --- Types ---

export interface McpServerConfig {
  readonly command: string
  readonly args: readonly string[]
  readonly env?: Readonly<Record<string, string>>
}

export interface WriteResult {
  readonly client: ClientName
  readonly configPath: string
  readonly action: 'added' | 'updated' | 'skipped'
}

// --- Helpers ---

const MCP_CLIENTS: ReadonlySet<ClientName> = new Set(['claude-desktop', 'cursor', 'vscode'])

interface McpConfigFile {
  mcpServers: Record<string, McpServerConfig>
  [key: string]: unknown
}

async function readExistingConfig(configPath: string): Promise<McpConfigFile> {
  try {
    const raw = await readFile(configPath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>
      if (typeof obj['mcpServers'] === 'object' && obj['mcpServers'] !== null) {
        return obj as McpConfigFile
      }
      return { ...obj, mcpServers: {} }
    }
  } catch {
    // File doesn't exist or invalid JSON — start fresh
  }

  return { mcpServers: {} }
}

// --- Public API ---

export async function writeMcpConfig(
  clients: readonly DetectedClient[],
  toolName: string,
  mcpConfig: McpServerConfig,
  projectRoot: string,
  homeDir?: string,
): Promise<WriteResult[]> {
  const mcpClients = clients.filter((c) => MCP_CLIENTS.has(c.name))
  const results: WriteResult[] = []

  for (const client of mcpClients) {
    const existing = await readExistingConfig(client.configPath)

    const alreadyExists = toolName in existing.mcpServers
    const action: WriteResult['action'] = alreadyExists ? 'updated' : 'added'

    existing.mcpServers[toolName] = {
      command: mcpConfig.command,
      args: [...mcpConfig.args],
      ...(mcpConfig.env !== undefined ? { env: { ...mcpConfig.env } } : {}),
    }

    const content = JSON.stringify(existing, null, 2)

    await mkdir(join(client.configPath, '..'), { recursive: true })

    await atomicWrite(client.configPath, content, projectRoot, {
      homeDir,
      stackDir: homeDir !== undefined ? join(homeDir, '.stack') : undefined,
      validate: (c) => {
        JSON.parse(c)
      },
    })

    results.push({
      client: client.name,
      configPath: client.configPath,
      action,
    })
  }

  return results
}
