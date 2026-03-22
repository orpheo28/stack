import { mkdir } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { atomicWrite } from '../utils/atomic-write.js'

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
      throw new Error(`Invalid package name: ${sdkPackage}`)
    }

    try {
      execSync(`npm install --save ${sdkPackage}`, {
        cwd: projectRoot,
        stdio: 'pipe',
        timeout: 60000,
      })
      packageInstalled = true
    } catch {
      // npm install failed — continue with template generation
    }
  }

  // 2. Generate template file
  const libDir = join(projectRoot, 'src', 'lib')
  await mkdir(libDir, { recursive: true })

  const filePath = join(libDir, `${toolName}.ts`)

  await atomicWrite(filePath, template, projectRoot, {
    homeDir,
    stackDir: homeDir !== undefined ? join(homeDir, '.stack') : undefined,
  })

  return { templatePath: filePath, packageInstalled }
}
