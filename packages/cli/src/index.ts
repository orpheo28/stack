import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)

interface PackageJson {
  version: string
  description: string
}

function getPackageInfo(): PackageJson {
  const pkgPath = join(currentDirPath, '..', 'package.json')
  const raw = readFileSync(pkgPath, 'utf-8')
  const parsed: unknown = JSON.parse(raw)

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    'description' in parsed &&
    typeof (parsed as Record<string, unknown>).version === 'string' &&
    typeof (parsed as Record<string, unknown>).description === 'string'
  ) {
    return parsed as PackageJson
  }

  return { version: '0.0.0', description: 'Stack CLI' }
}

export function createProgram(): Command {
  const pkg = getPackageInfo()

  const program = new Command()
    .name('stack')
    .description(pkg.description)
    .version(pkg.version, '-v, --version')

  // Commands will be registered here as they are built
  // Phase 1 build order from CLAUDE.md:
  // 1. stack install <tool>
  // 2. stack @handle
  // 3. stack publish
  // 4. stack search
  // 5. stack list
  // 6. stack remove
  // 7. stack rollback

  return program
}

function main(): void {
  const program = createProgram()
  program.parse(process.argv)
}

main()
