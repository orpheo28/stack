import { access, constants } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir, platform } from 'node:os'

// --- Types ---

export type ClientName =
  | 'claude-desktop'
  | 'cursor'
  | 'vscode'
  | 'windsurf'
  | 'claude-code'
  | 'codex'
  | 'opencode'
  | 'copilot'
  | 'aider'
  | 'goose'
  | 'openclaw'
  | 'continue'
  | 'zed'
  | 'cody'
  | 'void'
  | 'trae'

export type ClientTier = 1 | 2 | 3
export type Certainty = 'confirmed' | 'probable'
export type ProjectType = 'node' | 'python' | 'unknown'

export interface DetectedClient {
  readonly name: ClientName
  readonly tier: ClientTier
  readonly configPath: string
  readonly certainty: Certainty
}

export interface DetectedContext {
  readonly clients: readonly DetectedClient[]
  readonly projectType: ProjectType
  readonly envFilePath: string | null
  readonly cwd: string
}

// --- Helpers ---

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch {
    return false
  }
}

export function getWindsurfMcpConfigPath(homeDir?: string): string {
  const home = homeDir ?? homedir()
  return join(home, '.codeium', 'windsurf', 'mcp_config.json')
}

export function getClaudeDesktopConfigPath(homeDir?: string): string {
  const home = homeDir ?? homedir()
  const currentPlatform = platform()

  if (currentPlatform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
  }

  if (currentPlatform === 'win32') {
    const appData = process.env['APPDATA'] ?? join(home, 'AppData', 'Roaming')
    return join(appData, 'Claude', 'claude_desktop_config.json')
  }

  // Linux — respect XDG_CONFIG_HOME
  const xdgConfig = process.env['XDG_CONFIG_HOME'] ?? join(home, '.config')
  return join(xdgConfig, 'claude', 'claude_desktop_config.json')
}

async function walkUpForFile(
  startDir: string,
  relativePath: string,
  stopDir?: string,
): Promise<string | null> {
  const stop = stopDir ?? homedir()
  let current = startDir

  for (;;) {
    const candidate = join(current, relativePath)
    if (await fileExists(candidate)) {
      return candidate
    }

    const parent = dirname(current)

    // Reached filesystem root
    if (parent === current) {
      return null
    }

    // Reached stop directory (home) — don't go above it
    // We check the parent, not current, to allow finding files AT the stop dir
    if (current === stop) {
      return null
    }

    current = parent
  }
}

// --- Client detectors ---

interface ClientCheck {
  readonly name: ClientName
  readonly tier: ClientTier
  readonly certainty: Certainty
  readonly detect: () => Promise<string | null>
}

function buildClientChecks(cwd: string, home: string): readonly ClientCheck[] {
  return [
    // Tier 1 — MCP config files
    {
      name: 'claude-desktop',
      tier: 1,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> => {
        const configPath = getClaudeDesktopConfigPath(home)
        return (await fileExists(configPath)) ? configPath : null
      },
    },
    {
      name: 'cursor',
      tier: 1,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> =>
        walkUpForFile(cwd, join('.cursor', 'mcp.json'), home),
    },
    {
      name: 'vscode',
      tier: 1,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> =>
        walkUpForFile(cwd, join('.vscode', 'mcp.json'), home),
    },
    {
      name: 'windsurf',
      tier: 1,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> => {
        // Windsurf MCP config — ~/.codeium/windsurf/mcp_config.json
        // Only return the JSON MCP config path (never .windsurfrules which is a rules file)
        const configPath = getWindsurfMcpConfigPath(home)
        if (await fileExists(configPath)) return configPath
        // If .windsurfrules exists, windsurf is present but MCP config doesn't exist yet
        // Still return the MCP config path so it gets created correctly
        const rulesPath = await walkUpForFile(cwd, '.windsurfrules', home)
        if (rulesPath !== null) return configPath
        return null
      },
    },

    // Tier 2 — Coding agent CLIs
    {
      name: 'claude-code',
      tier: 2,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> => walkUpForFile(cwd, 'CLAUDE.md', home),
    },
    {
      name: 'codex',
      tier: 2,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> => walkUpForFile(cwd, 'AGENTS.md', home),
    },
    {
      name: 'opencode',
      tier: 2,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> => {
        const jsonPath = join(cwd, 'opencode.json')
        if (await fileExists(jsonPath)) return jsonPath
        const configPath = join(cwd, '.opencode', 'config.json')
        if (await fileExists(configPath)) return configPath
        return null
      },
    },
    {
      name: 'copilot',
      tier: 2,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> =>
        walkUpForFile(cwd, join('.github', 'copilot-instructions.md'), home),
    },
    {
      name: 'aider',
      tier: 2,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> => walkUpForFile(cwd, '.aider.conf.yml', home),
    },
    {
      name: 'goose',
      tier: 2,
      certainty: 'confirmed',
      detect: async (): Promise<string | null> => {
        // Goose stores config in ~/.config/goose/config.yaml (home-based)
        const configPath = join(home, '.config', 'goose', 'config.yaml')
        return (await fileExists(configPath)) ? configPath : null
      },
    },

    // Tier 3 — Additional MCP clients
    {
      name: 'openclaw',
      tier: 3,
      certainty: 'probable',
      detect: async (): Promise<string | null> => {
        const configPath = join(home, '.openclaw', 'config.json')
        return (await fileExists(configPath)) ? configPath : null
      },
    },
    {
      name: 'continue',
      tier: 3,
      certainty: 'probable',
      detect: async (): Promise<string | null> =>
        walkUpForFile(cwd, join('.continue', 'config.json'), home),
    },
    {
      name: 'zed',
      tier: 3,
      certainty: 'probable',
      detect: async (): Promise<string | null> => {
        const configPath = join(home, '.config', 'zed', 'settings.json')
        return (await fileExists(configPath)) ? configPath : null
      },
    },
    {
      name: 'cody',
      tier: 3,
      certainty: 'probable',
      detect: async (): Promise<string | null> =>
        walkUpForFile(cwd, join('.vscode', 'cody.json'), home),
    },
    {
      name: 'void',
      tier: 3,
      certainty: 'probable',
      detect: async (): Promise<string | null> =>
        walkUpForFile(cwd, join('.void', 'rules', 'global.md'), home),
    },
    {
      name: 'trae',
      tier: 3,
      certainty: 'probable',
      detect: async (): Promise<string | null> =>
        walkUpForFile(cwd, join('.trae', 'mcp.json'), home),
    },
  ]
}

// --- Project & env detection ---

async function detectProjectType(cwd: string): Promise<ProjectType> {
  if (await fileExists(join(cwd, 'package.json'))) return 'node'
  if (await fileExists(join(cwd, 'pyproject.toml'))) return 'python'
  if (await fileExists(join(cwd, 'requirements.txt'))) return 'python'
  return 'unknown'
}

async function detectEnvFile(cwd: string): Promise<string | null> {
  const dotenv = join(cwd, '.env')
  if (await fileExists(dotenv)) return dotenv
  const dotenvLocal = join(cwd, '.env.local')
  if (await fileExists(dotenvLocal)) return dotenvLocal
  return null
}

// --- Main export ---

export async function detectContext(cwd?: string, homeDir?: string): Promise<DetectedContext> {
  const resolvedCwd = cwd ?? process.cwd()
  const resolvedHome = homeDir ?? homedir()

  const checks = buildClientChecks(resolvedCwd, resolvedHome)

  // Run all checks in parallel
  const results = await Promise.all(
    checks.map(async (check) => {
      const configPath = await check.detect()
      if (configPath === null) return null
      return {
        name: check.name,
        tier: check.tier,
        configPath,
        certainty: check.certainty,
      } as const
    }),
  )

  // Filter nulls and sort by tier
  const clients: DetectedClient[] = results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.tier - b.tier)

  const [projectType, envFilePath] = await Promise.all([
    detectProjectType(resolvedCwd),
    detectEnvFile(resolvedCwd),
  ])

  return {
    clients,
    projectType,
    envFilePath,
    cwd: resolvedCwd,
  }
}
