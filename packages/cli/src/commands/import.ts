import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { analyzeGitHubRepo, parseGitHubUrl } from '../analyzers/github-repo.js'
import { installTool } from './install.js'
import { findTool } from '../registry/tools.js'
import { writeClaudeMd, writeCursorRules, writeWindsurfrules } from '../writers/config.js'
import { writeSkills } from '../writers/skills.js'
import { scanClaudeMd } from '../security/scan.js'
import { StackError } from '../types/errors.js'
import type { RepoAnalysis } from '../analyzers/github-repo.js'

// --- Display helpers ---

function displayAnalysis(analysis: RepoAnalysis): void {
  console.log(chalk.cyan(`\n📦 ${analysis.owner}/${analysis.repo}\n`))

  if (analysis.skills.length > 0) {
    console.log(chalk.bold('Skills:'))
    for (const skill of analysis.skills) {
      console.log(`  ${chalk.green('+')} ${skill.name}`)
    }
    console.log()
  }

  if (analysis.mcpConfigs.length > 0) {
    console.log(chalk.bold('MCP Servers:'))
    for (const mcp of analysis.mcpConfigs) {
      console.log(`  ${chalk.green('+')} ${mcp.name} → ${mcp.command} ${mcp.args.join(' ')}`)
    }
    console.log()
  }

  if (analysis.detectedTools.length > 0) {
    console.log(chalk.bold('Known tools (from package.json):'))
    for (const tool of analysis.detectedTools) {
      console.log(`  ${chalk.green('+')} ${tool}`)
    }
    console.log()
  }

  if (analysis.claudeMd !== null) {
    console.log(
      `  ${chalk.dim('CLAUDE.md')} detected (${analysis.claudeMd.length.toString()} chars)`,
    )
  }
  if (analysis.cursorRules !== null) {
    console.log(`  ${chalk.dim('.cursorrules')} detected`)
  }
  if (analysis.windsurfRules !== null) {
    console.log(`  ${chalk.dim('.windsurfrules')} detected`)
  }

  if (analysis.envVarNames.length > 0) {
    console.log(chalk.bold('\nEnvironment variables:'))
    for (const name of analysis.envVarNames) {
      console.log(`  ${chalk.yellow(name)}`)
    }
  }

  const total =
    analysis.skills.length +
    analysis.mcpConfigs.length +
    analysis.detectedTools.length +
    (analysis.claudeMd !== null ? 1 : 0) +
    (analysis.cursorRules !== null ? 1 : 0)
  console.log(chalk.dim(`\n${total.toString()} items detected`))
}

// --- Import logic ---

async function executeImport(analysis: RepoAnalysis, dryRun: boolean): Promise<void> {
  const cwd = process.cwd()

  if (dryRun) {
    console.log(chalk.yellow('\n--dry-run: no changes will be made\n'))
    displayAnalysis(analysis)
    return
  }

  displayAnalysis(analysis)

  // Confirm before proceeding
  const { default: inquirer } = await import('inquirer')
  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
    { type: 'confirm', name: 'proceed', message: 'Import this setup?', default: true },
  ])
  if (!proceed) return

  const start = Date.now()
  let installed = 0

  // 1. Install skills (if present — this is the gstack pattern)
  if (analysis.skills.length > 0) {
    const skillSpinner = ora(
      `Installing ${analysis.skills.length.toString()} skills from ${analysis.owner}/${analysis.repo}...`,
    ).start()

    try {
      const result = await writeSkills(analysis.owner, analysis.repo)
      skillSpinner.succeed(
        `Skills installed to ${chalk.dim(result.skillsDir)} (${result.skillCount.toString()} files)`,
      )
      installed += analysis.skills.length
    } catch (error) {
      skillSpinner.fail('Failed to install skills')
      if (error instanceof StackError) {
        console.error(chalk.red(`  ${error.message}`))
      }
    }
  }

  // 2. Install detected tools from registry
  if (analysis.detectedTools.length > 0) {
    const toolSpinner = ora(
      `Installing ${analysis.detectedTools.length.toString()} tools...`,
    ).start()

    const results = await Promise.allSettled(
      analysis.detectedTools.map(async (toolName) => {
        const tool = await findTool(toolName)
        if (tool !== undefined) {
          return installTool(tool, cwd, { skipNpmInstall: true })
        }
        return null
      }),
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value !== null).length
    toolSpinner.succeed(`${succeeded.toString()} tools installed`)
    installed += succeeded
  }

  // 3. Apply CLAUDE.md (with prompt injection scan + diff)
  if (analysis.claudeMd !== null) {
    // Security: scan for prompt injection before applying
    const scanResult = scanClaudeMd(analysis.claudeMd)
    if (scanResult.status === 'BLOCKED') {
      console.log(
        chalk.red(
          `\n⚠️  CLAUDE.md blocked — potential prompt injection detected: ${scanResult.blockedPatterns.join(', ')}`,
        ),
      )
    } else {
      await writeClaudeMd(analysis.claudeMd, cwd, cwd, { interactive: true })
      installed++
    }
  }

  // 4. Apply cursor rules
  if (analysis.cursorRules !== null) {
    await writeCursorRules(analysis.cursorRules, cwd, cwd, { interactive: true })
    installed++
  }

  // 5. Apply windsurf rules
  if (analysis.windsurfRules !== null) {
    await writeWindsurfrules(analysis.windsurfRules, cwd, cwd, { interactive: true })
    installed++
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1)
  console.log(
    chalk.green(
      `\n✓ Imported ${analysis.owner}/${analysis.repo} in ${duration}s — ${installed.toString()} items configured`,
    ),
  )
}

// --- CLI command ---

export function createImportCommand(): Command {
  return new Command('import')
    .argument('<url>', 'GitHub repository URL (e.g., github.com/garrytan/gstack)')
    .option('--dry-run', 'Preview what would be imported without making changes')
    .description('Import a developer setup from a GitHub repository')
    .action(async (url: string, opts: { dryRun?: boolean }) => {
      const { owner, repo } = parseGitHubUrl(url)

      const spinner = ora(`Analyzing ${owner}/${repo}...`).start()

      let analysis: RepoAnalysis
      try {
        analysis = await analyzeGitHubRepo(owner, repo)
      } catch (error) {
        spinner.fail(`Failed to analyze ${owner}/${repo}`)
        if (error instanceof StackError) throw error
        throw new StackError(
          'STACK_004',
          `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }

      spinner.stop()

      const hasContent =
        analysis.skills.length > 0 ||
        analysis.mcpConfigs.length > 0 ||
        analysis.detectedTools.length > 0 ||
        analysis.claudeMd !== null ||
        analysis.cursorRules !== null

      if (!hasContent) {
        console.log(
          chalk.yellow(
            `\nNo importable content found in ${owner}/${repo}.\n` +
              'Expected: CLAUDE.md, .cursorrules, skills/, MCP configs, or known tools in package.json.',
          ),
        )
        return
      }

      await executeImport(analysis, opts.dryRun === true)
    })
}
