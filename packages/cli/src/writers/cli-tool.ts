import { mkdir, writeFile, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface CliToolResult {
  readonly binPath: string
  readonly pathUpdated: boolean
}

function getStackBinDir(homeDir?: string): string {
  return join(homeDir ?? homedir(), '.stack', 'bin')
}

export async function writeCliTool(
  toolName: string,
  source: string,
  homeDir?: string,
): Promise<CliToolResult> {
  const binDir = getStackBinDir(homeDir)
  await mkdir(binDir, { recursive: true })

  const binPath = join(binDir, toolName)

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

  await writeFile(binPath, script, 'utf-8')
  await chmod(binPath, 0o755)

  // Check if ~/.stack/bin is in PATH
  const pathEnv = process.env['PATH'] ?? ''
  const pathUpdated = pathEnv.includes(binDir)

  return { binPath, pathUpdated }
}
