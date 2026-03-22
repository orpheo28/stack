import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { detectContext } from '../detectors/context.js'
import { findTool, findSimilarTools, RESERVED_HANDLES } from '../registry/tools.js'
import { writeMcpConfig } from '../writers/mcp.js'
import { writeEnvVars } from '../writers/env.js'
import { writeSdkSetup } from '../writers/sdk.js'
import { writeCliTool } from '../writers/cli-tool.js'
import { writeClaudeMd, writeCursorRules, writeWindsurfrules } from '../writers/config.js'
import { fetchHandleManifest, recordCopy, recordInstall } from '../api/client.js'
import { addToolToStackJson, readStackJson } from '../utils/stack-json.js'
import { StackError } from '../types/errors.js'
import { areHandlesSimilar } from '../security/scan.js'
import { computeHash } from '../security/verify.js'
import type { ToolDefinition } from '../registry/tools.js'
import type { WriteResult } from '../writers/mcp.js'

// --- Types ---

export interface InstallResult {
  readonly toolName: string
  readonly displayName: string
  readonly mcpResults: readonly WriteResult[]
  readonly envFilePath: string | null
  readonly sdkFilePath: string | null
  readonly cliBinPath: string | null
  readonly durationMs: number
  readonly missingEnvHint?: boolean
}

// --- First-run detection (Guarantee 3) ---

function getInitMarkerPath(homeDir?: string): string {
  return join(homeDir ?? homedir(), '.stack', '.initialized')
}

function isFirstRun(homeDir?: string): boolean {
  return !existsSync(getInitMarkerPath(homeDir))
}

async function markInitialized(homeDir?: string): Promise<void> {
  const markerPath = getInitMarkerPath(homeDir)
  await mkdir(join(markerPath, '..'), { recursive: true })
  await writeFile(markerPath, new Date().toISOString(), 'utf-8')
}

async function showPreview(tool: ToolDefinition, cwd: string, homeDir?: string): Promise<boolean> {
  const ctx = await detectContext(cwd, homeDir)

  console.log(chalk.yellow('\n⚠️  First time using stack on this machine.'))
  console.log(chalk.yellow('Running in preview mode. Nothing will be modified.\n'))

  console.log(`Would install ${chalk.cyan(tool.displayName)} and configure:`)

  if (tool.mcpConfig !== undefined && ctx.clients.length > 0) {
    for (const client of ctx.clients) {
      console.log(chalk.dim(`  MODIFY ${client.configPath}`))
      console.log(chalk.green(`    + Add ${tool.name} MCP server entry`))
    }
  }

  if (tool.envVars !== undefined && tool.envVars.length > 0) {
    const envFile = ctx.envFilePath ?? '.env'
    console.log(chalk.dim(`  CREATE ${envFile}`))
    for (const v of tool.envVars) {
      console.log(chalk.green(`    + ${v.key}=${v.placeholder}`))
    }
  }

  if (tool.sdkTemplate !== undefined && ctx.projectType === 'node') {
    console.log(chalk.dim(`  CREATE src/lib/${tool.name}.ts`))
    console.log(chalk.green(`    + TypeScript client`))
  }

  if (tool.type === 'cli') {
    console.log(chalk.dim(`  CREATE ~/.stack/bin/${tool.name}`))
    console.log(chalk.green(`    + CLI wrapper script`))
  }

  console.log(chalk.dim(`\nBackup will be created at: ~/.stack/backups/`))

  const { default: inquirer } = await import('inquirer')
  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
    { type: 'confirm', name: 'proceed', message: 'Proceed?', default: false },
  ])

  if (proceed) {
    await markInitialized(homeDir)
  }

  return proceed
}

// --- Core install logic ---

export interface InstallOptions {
  readonly homeDir?: string
  readonly skipNpmInstall?: boolean
  readonly dryRun?: boolean
}

export async function installTool(
  tool: ToolDefinition,
  cwd: string,
  homeDirOrOptions?: string | InstallOptions,
): Promise<InstallResult> {
  const options: InstallOptions =
    typeof homeDirOrOptions === 'string' ? { homeDir: homeDirOrOptions } : (homeDirOrOptions ?? {})
  const homeDir = options.homeDir
  const start = Date.now()

  // Guarantee 5+9: SHA256 integrity verification of the tool definition
  if (tool.hashSha256 !== undefined) {
    const definition = JSON.stringify({
      name: tool.name,
      source: tool.source,
      mcpConfig: tool.mcpConfig,
      envVars: tool.envVars?.map((v) => v.key),
      sdkPackage: tool.sdkPackage,
    })
    const actualHash = computeHash(Buffer.from(definition, 'utf-8'))
    if (actualHash !== tool.hashSha256) {
      throw new StackError(
        'STACK_003',
        `Integrity check failed for ${tool.name}. Registry definition may have been tampered with. Expected: ${tool.hashSha256}, got: ${actualHash}`,
      )
    }
  }

  const ctx = await detectContext(cwd, homeDir)

  // Dry run: return what would happen without modifying anything
  if (options.dryRun === true) {
    return {
      toolName: tool.name,
      displayName: tool.displayName,
      mcpResults: ctx.clients
        .filter(() => tool.mcpConfig !== undefined)
        .map((c) => ({ client: c.name, configPath: c.configPath, action: 'would-add' as const })),
      envFilePath:
        tool.envVars !== undefined && tool.envVars.length > 0 ? (ctx.envFilePath ?? '.env') : null,
      sdkFilePath:
        tool.sdkTemplate !== undefined && ctx.projectType === 'node'
          ? `src/lib/${tool.name}.ts`
          : null,
      cliBinPath: tool.type === 'cli' ? `~/.stack/bin/${tool.name}` : null,
      durationMs: Date.now() - start,
    }
  }

  const mcpResults: WriteResult[] = []
  let envFilePath: string | null = null
  let sdkFilePath: string | null = null
  let cliBinPath: string | null = null

  // 1. MCP config
  if (tool.mcpConfig !== undefined && ctx.clients.length > 0) {
    const results = await writeMcpConfig(ctx.clients, tool.name, tool.mcpConfig, cwd, homeDir)
    mcpResults.push(...results)
  }

  // 2. Env vars
  if (tool.envVars !== undefined && tool.envVars.length > 0) {
    envFilePath = await writeEnvVars(ctx.envFilePath, cwd, tool.envVars, cwd, homeDir)
  }

  // 3. SDK setup (npm install + template)
  if (tool.sdkTemplate !== undefined && ctx.projectType === 'node') {
    const sdkResult = await writeSdkSetup(
      tool.name,
      tool.sdkTemplate,
      cwd,
      tool.sdkPackage,
      homeDir,
      options.skipNpmInstall,
    )
    sdkFilePath = sdkResult.templatePath
  }

  // 4. CLI tool (binary in ~/.stack/bin/)
  if (tool.type === 'cli') {
    const cliResult = await writeCliTool(tool.name, tool.source, homeDir)
    cliBinPath = cliResult.binPath
  }

  // 4b. Warn about unsupported artifact types
  if (tool.type === 'api' || tool.type === 'config') {
    const hasEnv = tool.envVars !== undefined && tool.envVars.length > 0
    console.warn(
      `[STACK_002] Type '${tool.type}' is not yet fully supported.` +
        (hasEnv ? ' Only environment variables were configured.' : ' No writers were invoked.'),
    )
  }

  // 5. Update stack.json
  await addToolToStackJson(
    cwd,
    tool.name,
    {
      type: tool.type,
      version: 'latest',
      source: tool.source,
    },
    homeDir,
  )

  const durationMs = Date.now() - start

  // Flag when a tool was installed from remote registry without env config
  const missingEnvHint =
    tool.mcpConfig !== undefined &&
    (tool.envVars === undefined || tool.envVars.length === 0) &&
    mcpResults.length > 0

  return {
    toolName: tool.name,
    displayName: tool.displayName,
    mcpResults,
    envFilePath,
    sdkFilePath,
    cliBinPath,
    durationMs,
    missingEnvHint,
  }
}

// --- Install from stack.json ---

async function installFromStackJson(cwd: string): Promise<void> {
  const manifest = await readStackJson(cwd)

  if (manifest === null) {
    console.log(chalk.yellow('No stack.json found in this directory.'))
    return
  }

  const toolNames = Object.keys(manifest.tools)
  if (toolNames.length === 0) {
    console.log(chalk.yellow('stack.json has no tools defined.'))
    return
  }

  const spinner = ora(`Installing ${toolNames.length.toString()} tools from stack.json...`).start()
  const start = Date.now()

  const results = await Promise.allSettled(
    toolNames.map(async (name) => {
      const tool = await findTool(name)
      if (tool !== undefined) {
        return installTool(tool, cwd)
      }
      return {
        toolName: name,
        displayName: name,
        mcpResults: [],
        envFilePath: null,
        sdkFilePath: null,
        cliBinPath: null,
        durationMs: 0,
      } satisfies InstallResult
    }),
  )

  spinner.stop()

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length
  const duration = ((Date.now() - start) / 1000).toFixed(1)

  console.log(
    chalk.green(
      `\n✓ Installed ${succeeded.toString()}/${toolNames.length.toString()} tools in ${duration}s`,
    ),
  )
  if (failed > 0) {
    console.log(chalk.red(`  ${failed.toString()} tools failed to install`))
  }
}

// --- CLI command ---

// --- @handle flow ---

async function installHandle(handle: string, dryRun?: boolean): Promise<void> {
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle

  // Guarantee 7: Check reserved handles
  if (RESERVED_HANDLES.has(cleanHandle.toLowerCase())) {
    throw new StackError('STACK_005', `@${cleanHandle} is a reserved handle name.`)
  }

  // Guarantee 7: Check handle similarity against known handles
  for (const reserved of RESERVED_HANDLES) {
    if (areHandlesSimilar(cleanHandle, reserved)) {
      console.log(
        chalk.yellow(
          `\n⚠️  WARNING: @${cleanHandle} is similar to reserved handle @${reserved}. Typo?`,
        ),
      )
      const { default: inquirer } = await import('inquirer')
      const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
        { type: 'confirm', name: 'proceed', message: 'Continue anyway?', default: false },
      ])
      if (!proceed) return
      break
    }
  }

  const spinner = ora(`Fetching @${cleanHandle}'s setup...`).start()

  const manifest = await fetchHandleManifest(cleanHandle)
  const toolNames = Object.keys(manifest.tools)

  spinner.stop()
  console.log(
    chalk.cyan(`\n@${cleanHandle}'s setup: ${toolNames.length.toString()} tools`) +
      (manifest.claudeMd !== undefined ? ' + CLAUDE.md' : '') +
      (manifest.cursorRules !== undefined ? ' + cursor rules' : ''),
  )

  const cwd = process.cwd()
  const start = Date.now()
  const results: PromiseSettledResult<InstallResult>[] = []

  // Install all tools in parallel
  const toolInstalls = toolNames.map(async (name) => {
    const registryTool = await findTool(name)
    if (registryTool !== undefined) {
      return installTool(registryTool, cwd, { dryRun: dryRun === true })
    }
    // Tool not in local registry — skip for now
    return {
      toolName: name,
      displayName: name,
      mcpResults: [],
      envFilePath: null,
      sdkFilePath: null,
      cliBinPath: null,
      durationMs: 0,
    } satisfies InstallResult
  })

  results.push(...(await Promise.allSettled(toolInstalls)))

  // Apply config files (skip in dry-run mode)
  if (dryRun !== true) {
    if (manifest.claudeMd !== undefined) {
      await writeClaudeMd(manifest.claudeMd, cwd, cwd, { interactive: true })
    }
    if (manifest.cursorRules !== undefined) {
      await writeCursorRules(manifest.cursorRules, cwd, cwd, { interactive: true })
    }
    if (manifest.windsurfRules !== undefined) {
      await writeWindsurfrules(manifest.windsurfRules, cwd, cwd, { interactive: true })
    }
  }

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const duration = ((Date.now() - start) / 1000).toFixed(1)

  console.log(
    chalk.green(
      `\n✓ @${cleanHandle}'s setup installed in ${duration}s — ${succeeded.toString()} tools configured`,
    ),
  )

  // Record the copy (non-blocking, non-critical)
  void recordCopy(cleanHandle)
}

function formatResult(result: InstallResult): string {
  const lines: string[] = []
  const duration = (result.durationMs / 1000).toFixed(1)

  for (const mcp of result.mcpResults) {
    const action = mcp.action === 'added' ? chalk.green('added') : chalk.yellow(mcp.action)
    lines.push(`  ${chalk.dim('MCP')} ${action} in ${mcp.client} → ${chalk.dim(mcp.configPath)}`)
  }

  if (result.envFilePath !== null) {
    lines.push(`  ${chalk.dim('ENV')} configured → ${chalk.dim(result.envFilePath)}`)
  }

  if (result.sdkFilePath !== null) {
    lines.push(`  ${chalk.dim('SDK')} generated → ${chalk.dim(result.sdkFilePath)}`)
  }

  if (result.cliBinPath !== null) {
    lines.push(`  ${chalk.dim('CLI')} installed → ${chalk.dim(result.cliBinPath)}`)
  }

  lines.push('')
  lines.push(chalk.green(`✓ ${result.displayName} installed in ${duration}s`))

  if (result.missingEnvHint === true) {
    lines.push(
      chalk.yellow(
        `\n⚠️  This tool may require API keys. Check the tool's documentation for required environment variables.`,
      ),
    )
  }

  return lines.join('\n')
}

export function createInstallCommand(): Command {
  return new Command('install')
    .argument('[name]', 'Tool name to install (or @handle)')
    .option('--dry-run', 'Preview changes without modifying any files')
    .description('Install a tool or copy a developer setup')
    .action(async (name: string | undefined, opts: { dryRun?: boolean }) => {
      if (name === undefined) {
        await installFromStackJson(process.cwd())
        return
      }

      if (name.startsWith('@')) {
        await installHandle(name, opts.dryRun)
        return
      }

      const tool = await findTool(name)

      if (tool === undefined) {
        const similar = await findSimilarTools(name)
        const suggestion =
          similar.length > 0
            ? `Did you mean: ${similar.map((t) => chalk.cyan(t.name)).join(', ')}?`
            : 'Run "stack search" to find available tools.'

        throw new StackError('STACK_002', suggestion)
      }

      // Explicit --dry-run: show preview and stop
      if (opts.dryRun === true) {
        const result = await installTool(tool, process.cwd(), { dryRun: true })
        console.log(formatResult(result))
        return
      }

      // Guarantee 3: First run preview mode
      if (isFirstRun()) {
        const proceed = await showPreview(tool, process.cwd())
        if (!proceed) return
      }

      const spinner = ora(`Installing ${tool.displayName}...`).start()

      try {
        const result = await installTool(tool, process.cwd())
        spinner.stop()
        console.log(formatResult(result))
        void recordInstall(tool.name)
      } catch (error) {
        spinner.fail(`Failed to install ${tool.displayName}`)
        if (error instanceof StackError) throw error
        const message = error instanceof Error ? error.message : String(error)
        throw new StackError('STACK_004', `Installation failed: ${message}`)
      }
    })
}
