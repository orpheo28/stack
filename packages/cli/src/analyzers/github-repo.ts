import { StackError } from '../types/errors.js'
import { findToolLocal } from '../registry/tools.js'

// --- Types ---

export interface DetectedMcpConfig {
  readonly name: string
  readonly command: string
  readonly args: readonly string[]
  readonly env?: Readonly<Record<string, string>>
}

export interface SkillDefinition {
  readonly name: string
  readonly description: string
  readonly relativePath: string
}

export interface RepoAnalysis {
  readonly owner: string
  readonly repo: string
  readonly claudeMd: string | null
  readonly cursorRules: string | null
  readonly windsurfRules: string | null
  readonly mcpConfigs: readonly DetectedMcpConfig[]
  readonly skills: readonly SkillDefinition[]
  readonly detectedTools: readonly string[]
  readonly envVarNames: readonly string[]
  readonly hasSetupScript: boolean
}

// --- GitHub API helpers ---

interface GitHubTreeEntry {
  readonly path: string
  readonly type: string
  readonly size?: number
}

interface GitHubTreeResponse {
  readonly tree: readonly GitHubTreeEntry[]
  readonly truncated: boolean
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'usedev-cli',
  }
  const token = process.env['GITHUB_TOKEN']
  if (token !== undefined && token !== '') {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function fetchRepoTree(owner: string, repo: string): Promise<readonly GitHubTreeEntry[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
  const response = await fetch(url, { headers: getGitHubHeaders() })

  if (!response.ok) {
    if (response.status === 404) {
      throw new StackError('STACK_002', `Repository ${owner}/${repo} not found.`)
    }
    throw new StackError(
      'STACK_004',
      `GitHub API error: ${response.status.toString()} ${response.statusText}`,
    )
  }

  const data = (await response.json()) as GitHubTreeResponse
  return data.tree
}

async function fetchFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  const response = await fetch(url, { headers: getGitHubHeaders() })

  if (!response.ok) return null

  const data = (await response.json()) as { content?: string; encoding?: string }
  if (data.content === undefined || data.encoding !== 'base64') return null

  return Buffer.from(data.content, 'base64').toString('utf-8')
}

// --- Analysis logic ---

function detectSkills(tree: readonly GitHubTreeEntry[]): readonly SkillDefinition[] {
  // Look for skills directories: skills/, .agents/skills/, .claude/skills/
  const skillDirs = ['skills/', '.agents/skills/', '.claude/skills/']
  const skills: SkillDefinition[] = []

  for (const entry of tree) {
    for (const dir of skillDirs) {
      if (entry.path.startsWith(dir) && entry.type === 'blob') {
        // Skill files are typically .md or contain SKILL.md
        if (entry.path.endsWith('.md') || entry.path.endsWith('/SKILL.md')) {
          const parts = entry.path.replace(dir, '').split('/')
          const name = parts[0]
          if (name !== undefined && name !== '') {
            // Deduplicate by name
            if (!skills.some((s) => s.name === name)) {
              skills.push({
                name,
                description: `Skill from ${dir}${name}`,
                relativePath: entry.path,
              })
            }
          }
        }
      }
    }
  }

  return skills
}

function detectMcpConfigs(content: string): readonly DetectedMcpConfig[] {
  try {
    const parsed: unknown = JSON.parse(content)
    if (typeof parsed !== 'object' || parsed === null) return []

    const obj = parsed as Record<string, unknown>

    // Look for mcpServers key (claude_desktop_config.json format)
    const servers = obj['mcpServers'] as Record<string, unknown> | undefined
    if (servers === undefined || typeof servers !== 'object') return []

    const configs: DetectedMcpConfig[] = []
    for (const [name, serverConfig] of Object.entries(servers)) {
      if (typeof serverConfig !== 'object' || serverConfig === null) continue
      const sc = serverConfig as Record<string, unknown>
      if (typeof sc['command'] === 'string') {
        configs.push({
          name,
          command: sc['command'],
          args: Array.isArray(sc['args']) ? (sc['args'] as string[]) : [],
          env:
            typeof sc['env'] === 'object' && sc['env'] !== null
              ? (sc['env'] as Record<string, string>)
              : undefined,
        })
      }
    }
    return configs
  } catch {
    return []
  }
}

function detectToolsFromPackageJson(content: string): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(content)
    if (typeof parsed !== 'object' || parsed === null) return []

    const obj = parsed as Record<string, unknown>
    const allDeps: Record<string, unknown> = {
      ...(typeof obj['dependencies'] === 'object' && obj['dependencies'] !== null
        ? (obj['dependencies'] as Record<string, unknown>)
        : {}),
      ...(typeof obj['devDependencies'] === 'object' && obj['devDependencies'] !== null
        ? (obj['devDependencies'] as Record<string, unknown>)
        : {}),
    }

    const detected: string[] = []
    for (const dep of Object.keys(allDeps)) {
      // Check if this npm package name matches a tool name directly
      const tool = findToolLocal(dep)
      if (tool !== undefined) {
        detected.push(tool.name)
      }
    }

    return [...new Set(detected)]
  } catch {
    return []
  }
}

function detectEnvVars(content: string): readonly string[] {
  const vars: string[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim()
      if (/^[A-Z_][A-Z0-9_]*$/.test(key)) {
        vars.push(key)
      }
    }
  }
  return vars
}

// --- Public API ---

export async function analyzeGitHubRepo(owner: string, repo: string): Promise<RepoAnalysis> {
  const tree = await fetchRepoTree(owner, repo)
  const filePaths = tree.filter((e) => e.type === 'blob').map((e) => e.path)

  // Detect files of interest
  const hasClaudeMd = filePaths.includes('CLAUDE.md')
  const hasCursorRules = filePaths.includes('.cursorrules')
  const hasWindsurfRules = filePaths.includes('.windsurfrules')
  const hasPackageJson = filePaths.includes('package.json')
  const hasSetupScript =
    filePaths.includes('setup') ||
    filePaths.includes('setup.sh') ||
    filePaths.includes('install.sh')

  // MCP config files
  const mcpConfigPaths = filePaths.filter(
    (p) =>
      p === 'claude_desktop_config.json' ||
      p === '.cursor/mcp.json' ||
      p === '.vscode/mcp.json' ||
      p.endsWith('mcp.json'),
  )

  // Env example files
  const envExamplePaths = filePaths.filter(
    (p) => p === '.env.example' || p === '.env.template' || p === '.env.sample',
  )

  // Fetch files in parallel
  const fetchPromises: Promise<void>[] = []
  let claudeMd: string | null = null
  let cursorRules: string | null = null
  let windsurfRules: string | null = null
  const mcpConfigs: DetectedMcpConfig[] = []
  let detectedTools: readonly string[] = []
  let envVarNames: string[] = []

  if (hasClaudeMd) {
    fetchPromises.push(
      fetchFileContent(owner, repo, 'CLAUDE.md').then((content) => {
        claudeMd = content
      }),
    )
  }

  if (hasCursorRules) {
    fetchPromises.push(
      fetchFileContent(owner, repo, '.cursorrules').then((content) => {
        cursorRules = content
      }),
    )
  }

  if (hasWindsurfRules) {
    fetchPromises.push(
      fetchFileContent(owner, repo, '.windsurfrules').then((content) => {
        windsurfRules = content
      }),
    )
  }

  for (const mcpPath of mcpConfigPaths) {
    fetchPromises.push(
      fetchFileContent(owner, repo, mcpPath).then((content) => {
        if (content !== null) {
          mcpConfigs.push(...detectMcpConfigs(content))
        }
      }),
    )
  }

  if (hasPackageJson) {
    fetchPromises.push(
      fetchFileContent(owner, repo, 'package.json').then((content) => {
        if (content !== null) {
          detectedTools = detectToolsFromPackageJson(content)
        }
      }),
    )
  }

  for (const envPath of envExamplePaths) {
    fetchPromises.push(
      fetchFileContent(owner, repo, envPath).then((content) => {
        if (content !== null) {
          envVarNames = [...envVarNames, ...detectEnvVars(content)]
        }
      }),
    )
  }

  await Promise.all(fetchPromises)

  // Detect skills from tree structure
  const skills = detectSkills(tree)

  return {
    owner,
    repo,
    claudeMd,
    cursorRules,
    windsurfRules,
    mcpConfigs,
    skills,
    detectedTools,
    envVarNames: [...new Set(envVarNames)],
    hasSetupScript,
  }
}

/**
 * Parse a GitHub URL into owner/repo.
 * Supports: https://github.com/owner/repo, github.com/owner/repo, owner/repo
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string } {
  const cleaned = input
    .replace(/^https?:\/\//, '')
    .replace(/^github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')

  // Remove any path after owner/repo (e.g., /tree/main)
  const parts = cleaned.split('/')
  if (parts.length < 2 || parts[0] === '' || parts[1] === '') {
    throw new StackError(
      'STACK_002',
      `Invalid GitHub URL: "${input}". Expected format: github.com/owner/repo`,
    )
  }

  return { owner: parts[0] as string, repo: parts[1] as string }
}
