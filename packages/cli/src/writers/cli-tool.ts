import { mkdir, chmod, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { atomicWrite } from '../utils/atomic-write.js'
import { assertPathAllowed } from '../security/whitelist.js'
import {
  parseGithubSource,
  fetchLatestRelease,
  pickAsset,
  downloadBinary,
  verifySha256IfAvailable,
} from '../utils/github-release.js'

export interface CliToolResult {
  readonly binPath: string
  readonly pathUpdated: boolean
}

function getStackBinDir(homeDir?: string): string {
  return join(homeDir ?? homedir(), '.stack', 'bin')
}

const PATH_EXPORT_LINE = 'export PATH="$HOME/.stack/bin:$PATH"'
const PATH_MARKER = '# Added by stack CLI'

async function ensurePathInShellRc(homeDir?: string): Promise<boolean> {
  const home = homeDir ?? homedir()
  const pathEnv = process.env['PATH'] ?? ''
  const binDir = getStackBinDir(homeDir)

  if (pathEnv.includes(binDir)) return true

  // Find the shell rc file
  const shell = process.env['SHELL'] ?? '/bin/zsh'
  const rcFile = shell.includes('zsh') ? join(home, '.zshrc') : join(home, '.bashrc')

  let existing = ''
  try {
    existing = await readFile(rcFile, 'utf-8')
    if (existing.includes(PATH_EXPORT_LINE)) return true
  } catch {
    // File doesn't exist — will be created
  }

  // Atomic write: read full content → append PATH → write atomically
  let content = existing
  if (content.length > 0 && !content.endsWith('\n')) {
    content += '\n'
  }
  content += `\n${PATH_MARKER}\n${PATH_EXPORT_LINE}\n`

  assertPathAllowed(rcFile, process.cwd(), home)
  await atomicWrite(rcFile, content, process.cwd(), {
    homeDir: home,
    stackDir: join(home, '.stack'),
  })
  return false
}

export async function writeCliTool(
  toolName: string,
  source: string,
  homeDir?: string,
): Promise<CliToolResult> {
  const binDir = getStackBinDir(homeDir)
  await mkdir(binDir, { recursive: true })

  const binPath = join(binDir, toolName)
  const projectRoot = process.cwd()

  // Whitelist check before writing
  assertPathAllowed(binPath, projectRoot, homeDir ?? homedir())

  // Create a wrapper script that delegates to npx or the source
  let script: string
  if (source.startsWith('npm:')) {
    const pkg = source.slice(4)
    script = `#!/usr/bin/env bash\nexec npx -y ${pkg} "$@"\n`
  } else if (source.startsWith('github:')) {
    // Try to download binary from GitHub Releases
    const { owner, repo } = parseGithubSource(source)

    try {
      const release = await fetchLatestRelease(owner, repo)
      const asset = pickAsset(release)

      if (asset !== null) {
        await downloadBinary(asset.browser_download_url, binPath)
        await verifySha256IfAvailable(release, asset, binPath)
        const wasAlreadyInPath = await ensurePathInShellRc(homeDir)
        return { binPath, pathUpdated: !wasAlreadyInPath }
      }
    } catch {
      // GitHub API failed or no releases — fall through to wrapper script
    }

    // Fallback: wrapper script with instructions
    script = `#!/usr/bin/env bash\necho "Install ${toolName} from https://github.com/${owner}/${repo}/releases"\necho "Then run: ${toolName} \\$@"\n`
  } else {
    script = `#!/usr/bin/env bash\nexec npx -y ${source} "$@"\n`
  }

  await atomicWrite(binPath, script, projectRoot, {
    homeDir: homeDir ?? homedir(),
    stackDir: join(homeDir ?? homedir(), '.stack'),
  })
  await chmod(binPath, 0o755)

  // Ensure ~/.stack/bin is in PATH
  const wasAlreadyInPath = await ensurePathInShellRc(homeDir)

  return { binPath, pathUpdated: !wasAlreadyInPath }
}
