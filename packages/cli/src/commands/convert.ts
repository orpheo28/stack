import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { findTool, REGISTRY } from '../registry/tools.js'
import { writeSkillFile, generateSkillFromMcp } from '../writers/skill.js'
import { StackError } from '../types/errors.js'

export function createConvertCommand(): Command {
  return new Command('convert')
    .argument('[name]', 'Tool name to convert from MCP to skill')
    .option('--all', 'Convert all installed MCP tools to skills')
    .option('--dry-run', 'Preview the generated skill without writing files')
    .description('Convert MCP tools to skill mode (CLI + on-demand loading)')
    .action(async (name: string | undefined, opts: { all?: boolean; dryRun?: boolean }) => {
      if (opts.all === true) {
        await convertAll(opts.dryRun === true)
        return
      }

      if (name === undefined) {
        throw new StackError(
          'STACK_002',
          'Provide a tool name or use --all. Run "stack browse" to see available tools.',
        )
      }

      const tool = await findTool(name)
      if (tool === undefined) {
        throw new StackError(
          'STACK_002',
          `Tool "${name}" not found. Run "stack search ${name}" to find it.`,
        )
      }

      if (tool.mcpConfig === undefined) {
        console.log(chalk.yellow(`${tool.displayName} is not an MCP tool — nothing to convert.`))
        return
      }

      // Generate skill content
      const content = tool.skillFile ?? generateSkillFromMcp(tool)

      if (opts.dryRun === true) {
        console.log(chalk.cyan(`\n--- Skill for ${tool.displayName} ---\n`))
        console.log(content)
        console.log(chalk.dim(`\nWould write to: ~/.claude/skills/${tool.name}/SKILL.md`))
        return
      }

      const spinner = ora(`Converting ${tool.displayName} to skill...`).start()
      const result = await writeSkillFile(tool.name, content)
      spinner.succeed(`${tool.displayName} converted to skill`)
      console.log(chalk.dim(`  → ${result.skillPath}`))
      console.log(
        chalk.dim(`\n  Tip: Use --mcp with "stack install" if you need the MCP server back.`),
      )
    })
}

async function convertAll(dryRun: boolean): Promise<void> {
  const mcpTools = Array.from(REGISTRY.values()).filter((t) => t.mcpConfig !== undefined)

  if (dryRun) {
    console.log(chalk.cyan(`\nWould convert ${mcpTools.length.toString()} MCP tools to skills:\n`))
    for (const tool of mcpTools) {
      const hasCustom =
        tool.skillFile !== undefined ? chalk.green(' (custom)') : chalk.dim(' (auto)')
      console.log(`  ${tool.name}${hasCustom}`)
    }
    return
  }

  const spinner = ora(`Converting ${mcpTools.length.toString()} MCP tools to skills...`).start()
  let converted = 0

  for (const tool of mcpTools) {
    const content = tool.skillFile ?? generateSkillFromMcp(tool)
    await writeSkillFile(tool.name, content)
    converted++
  }

  spinner.succeed(`${converted.toString()} tools converted to skills`)
  console.log(chalk.dim(`  Skills written to ~/.claude/skills/`))
}
