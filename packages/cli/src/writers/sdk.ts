import { mkdir } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { atomicWrite } from '../utils/atomic-write.js'
import { StackError } from '../types/errors.js'

export interface SdkWriteResult {
  readonly templatePath: string
  readonly packageInstalled: boolean
}

const VALID_PACKAGE_NAME = /^(@[\w-]+\/)?[\w.-]+$/

export async function writeSdkSetup(
  toolName: string,
  template: string,
  projectRoot: string,
  sdkPackage?: string,
  homeDir?: string,
  skipNpmInstall?: boolean,
): Promise<SdkWriteResult> {
  // 1. Install npm package if specified
  let packageInstalled = false
  if (sdkPackage !== undefined && skipNpmInstall !== true) {
    // Validate package name to prevent command injection
    if (!VALID_PACKAGE_NAME.test(sdkPackage)) {
      throw new StackError(
        'STACK_002',
        `Invalid package name: ${sdkPackage}. Must match pattern: @scope/name or name`,
      )
    }

    try {
      execSync(`npm install --save ${sdkPackage}`, {
        cwd: projectRoot,
        stdio: 'pipe',
        timeout: 60000,
      })
      packageInstalled = true
    } catch {
      process.stderr.write(
        `Warning: npm install ${sdkPackage} failed — continuing with template generation\n`,
      )
    }
  }

  // 2. Generate template file
  const libDir = join(projectRoot, 'src', 'lib')
  await mkdir(libDir, { recursive: true })

  const filePath = join(libDir, `${toolName}.ts`)

  await atomicWrite(filePath, template, projectRoot, {
    homeDir,
    stackDir: homeDir !== undefined ? join(homeDir, '.stack') : undefined,
    validate: (content) => {
      if (content.trim().length === 0) {
        throw new StackError('STACK_001', `SDK template for ${toolName} is empty`)
      }
      if (
        !content.includes('import') &&
        !content.includes('export') &&
        !content.includes('require')
      ) {
        throw new StackError(
          'STACK_001',
          `SDK template for ${toolName} does not contain valid TypeScript (missing import/export/require)`,
        )
      }
    },
  })

  return { templatePath: filePath, packageInstalled }
}
