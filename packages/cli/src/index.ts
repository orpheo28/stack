import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createInstallCommand } from './commands/install.js'
import { createPublishCommand } from './commands/publish.js'
import { createSearchCommand } from './commands/search.js'
import { createListCommand } from './commands/list.js'
import { createRollbackCommand } from './commands/rollback.js'
import { createRemoveCommand } from './commands/remove.js'
import { createLoginCommand, createLogoutCommand, createWhoamiCommand } from './commands/auth.js'

const MINIMUM_NODE_MAJOR = 20

function checkNodeVersion(): void {
  const major = parseInt(process.versions.node.split('.')[0] ?? '0', 10)
  if (major < MINIMUM_NODE_MAJOR) {
    console.error(
      `STACK_008: Node.js ${String(MINIMUM_NODE_MAJOR)}+ required (current: ${process.versions.node}). Please upgrade Node.js.`,
    )
    process.exit(1)
  }
}

checkNodeVersion()

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

  program.addCommand(createInstallCommand())
  program.addCommand(createPublishCommand())
  program.addCommand(createSearchCommand())
  program.addCommand(createListCommand())
  program.addCommand(createRollbackCommand())
  program.addCommand(createRemoveCommand())
  program.addCommand(createLoginCommand())
  program.addCommand(createLogoutCommand())
  program.addCommand(createWhoamiCommand())

  return program
}

function main(): void {
  const program = createProgram()
  program.parse(process.argv)
}

const isDirectExecution =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url).includes(process.argv[1])

if (isDirectExecution) {
  main()
}
