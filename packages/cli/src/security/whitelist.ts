import { resolve, normalize, join } from 'node:path'
import { homedir } from 'node:os'
import { StackError } from '../types/errors.js'

interface WhitelistEntry {
  readonly path: string
  readonly mode: 'exact' | 'prefix'
}

function buildWhitelist(home: string, projectRoot: string): readonly WhitelistEntry[] {
  return [
    // Tier 1 — MCP config files (exact)
    {
      path: join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      mode: 'exact',
    },
    { path: join(home, '.cursor', 'mcp.json'), mode: 'exact' },
    { path: join(home, '.windsurfrules'), mode: 'exact' },

    // Project-relative MCP configs (exact)
    { path: join(projectRoot, '.cursor', 'mcp.json'), mode: 'exact' },
    { path: join(projectRoot, '.vscode', 'mcp.json'), mode: 'exact' },

    // Project-relative (exact)
    { path: join(projectRoot, '.cursorrules'), mode: 'exact' },
    { path: join(projectRoot, 'CLAUDE.md'), mode: 'exact' },
    { path: join(projectRoot, '.env'), mode: 'exact' },
    { path: join(projectRoot, '.env.local'), mode: 'exact' },
    { path: join(projectRoot, 'stack.json'), mode: 'exact' },

    // Project-relative (prefix — generated clients)
    { path: join(projectRoot, 'src', 'lib') + '/', mode: 'prefix' },

    // Stack internal directory (prefix)
    { path: join(home, '.stack') + '/', mode: 'prefix' },

    // Claude Code skills directory (prefix — for stack import)
    { path: join(home, '.claude', 'skills') + '/', mode: 'prefix' },

    // Shell configs (exact — append only)
    { path: join(home, '.zshrc'), mode: 'exact' },
    { path: join(home, '.bashrc'), mode: 'exact' },
  ]
}

export function isPathAllowed(filePath: string, projectRoot: string, homeDir?: string): boolean {
  const home = homeDir ?? homedir()
  const resolved = normalize(resolve(filePath))
  const resolvedProject = normalize(resolve(projectRoot))
  const whitelist = buildWhitelist(home, resolvedProject)

  for (const entry of whitelist) {
    const normalizedEntry = normalize(entry.path)

    if (entry.mode === 'exact') {
      if (resolved === normalizedEntry) {
        return true
      }
    } else {
      // prefix mode — resolved path must start with the entry path
      if (resolved.startsWith(normalizedEntry)) {
        return true
      }
    }
  }

  return false
}

export function assertPathAllowed(filePath: string, projectRoot: string, homeDir?: string): void {
  if (!isPathAllowed(filePath, projectRoot, homeDir)) {
    const resolved = normalize(resolve(filePath))
    throw new StackError(
      'STACK_009',
      `Path not in whitelist: ${resolved}. Stack can only write to approved locations.`,
    )
  }
}
