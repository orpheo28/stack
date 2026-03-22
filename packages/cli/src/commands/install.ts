import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { detectContext } from '../detectors/context.js'
import { findTool, findSimilarTools } from '../registry/tools.js'
import { writeMcpConfig } from '../writers/mcp.js'
import { writeEnvVars } from '../writers/env.js'
import { writeSdkSetup } from '../writers/sdk.js'
import { writeCliTool } from '../writers/cli-tool.js'
import { writeClaudeMd, writeCursorRules } from '../writers/config.js'
import { fetchHandleManifest, recordCopy } from '../api/client.js'
import { addToolToStackJson, readStackJson } from '../utils/stack-json.js'
import { StackError } from '../types/errors.js'
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
}

// --- Core install logic ---

export interface InstallOptions {
  readonly homeDir?: string
  readonly skipNpmInstall?: boolean
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
  const ctx = await detectContext(cwd, homeDir)

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

  return {
    toolName: tool.name,
    displayName: tool.displayName,
    mcpResults,
    envFilePath,
    sdkFilePath,
    cliBinPath,
    durationMs,
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
      const tool = findTool(name)
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

async function installHandle(handle: string): Promise<void> {
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle
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
    const registryTool = findTool(name)
    if (registryTool !== undefined) {
      return installTool(registryTool, cwd)
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

  // Apply CLAUDE.md if present — ALWAYS interactive (diff + confirm)
  if (manifest.claudeMd !== undefined) {
    await writeClaudeMd(manifest.claudeMd, cwd, cwd, { interactive: true })
  }

  // Apply cursor rules if present — ALWAYS interactive (diff + confirm)
  if (manifest.cursorRules !== undefined) {
    await writeCursorRules(manifest.cursorRules, cwd, cwd, { interactive: true })
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

  return lines.join('\n')
}

export function createInstallCommand(): Command {
  return new Command('install')
    .argument('[name]', 'Tool name to install (or @handle)')
    .description('Install a tool or copy a developer setup')
    .action(async (name?: string) => {
      if (name === undefined) {
        await installFromStackJson(process.cwd())
        return
      }

      if (name.startsWith('@')) {
        await installHandle(name)
        return
      }

      const tool = findTool(name)

      if (tool === undefined) {
        const similar = findSimilarTools(name)
        const suggestion =
          similar.length > 0
            ? `Did you mean: ${similar.map((t) => chalk.cyan(t.name)).join(', ')}?`
            : 'Run "stack search" to find available tools.'

        throw new StackError('STACK_002', suggestion)
      }

      const spinner = ora(`Installing ${tool.displayName}...`).start()

      try {
        const result = await installTool(tool, process.cwd())
        spinner.stop()
        console.log(formatResult(result))
      } catch (error) {
        spinner.fail(`Failed to install ${tool.displayName}`)
        throw error
      }
    })
}
