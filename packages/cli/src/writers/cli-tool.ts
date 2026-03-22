import { mkdir, chmod, readFile, appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { atomicWrite } from '../utils/atomic-write.js'
import { assertPathAllowed } from '../security/whitelist.js'

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

  try {
    const content = await readFile(rcFile, 'utf-8')
    if (content.includes(PATH_EXPORT_LINE)) return true
  } catch {
    // File doesn't exist — will be created by appendFile
  }

  await appendFile(rcFile, `\n${PATH_MARKER}\n${PATH_EXPORT_LINE}\n`)
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
    const repo = source.slice(7)
    script = `#!/usr/bin/env bash\necho "Install ${toolName} from https://github.com/${repo}"\necho "Then run: ${toolName} \\$@"\n`
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
