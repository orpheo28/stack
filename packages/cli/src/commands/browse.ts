import { Command } from 'commander'
import chalk from 'chalk'
import { REGISTRY } from '../registry/tools.js'
import type { ToolDefinition } from '../registry/tools.js'

// --- Helpers ---

function groupByCategory(tools: readonly ToolDefinition[]): Map<string, ToolDefinition[]> {
  const groups = new Map<string, ToolDefinition[]>()
  for (const tool of tools) {
    const cat = tool.category ?? 'Other'
    const existing = groups.get(cat)
    if (existing !== undefined) {
      existing.push(tool)
    } else {
      groups.set(cat, [tool])
    }
  }
  return groups
}

const CATEGORY_ORDER = [
  'MCP — Cloud & SaaS',
  'MCP — Dev Tools',
  'MCP — AI & ML',
  'MCP — Official',
  'MCP — Databases',
  'SDKs — AI',
  'SDKs — Infrastructure',
  'SDKs — Payments & SaaS',
  'CLIs — Agent-native',
]

// --- Command ---

export function createBrowseCommand(): Command {
  return new Command('browse')
    .description('Browse all available tools by category')
    .option('--all', 'Show all tools without interactive selection')
    .action(async (opts: { all?: boolean }) => {
      const allTools = Array.from(REGISTRY.values())
      const groups = groupByCategory(allTools)

      if (opts.all === true) {
        // Non-interactive: print everything
        for (const cat of CATEGORY_ORDER) {
          const tools = groups.get(cat)
          if (tools === undefined) continue

          console.log(chalk.cyan(`\n${cat} (${tools.length.toString()})`))
          for (const tool of tools) {
            console.log(`  ${chalk.bold(tool.name)} — ${chalk.dim(tool.description)}`)
          }
        }
        console.log(chalk.dim(`\n${allTools.length.toString()} tools available`))
        return
      }

      // Interactive: pick a category, then show tools, then offer to install
      const { default: inquirer } = await import('inquirer')

      const categoryChoices = CATEGORY_ORDER.map((cat) => {
        const tools = groups.get(cat)
        if (tools === undefined) return null
        return {
          name: `${cat} (${tools.length.toString()})`,
          value: cat,
        }
      }).filter((c): c is { name: string; value: string } => c !== null)

      const { category } = await inquirer.prompt<{ category: string }>([
        {
          type: 'list',
          name: 'category',
          message: 'Browse tools by category:',
          choices: categoryChoices,
        },
      ])

      const tools = groups.get(category)
      if (tools === undefined) return

      console.log(chalk.cyan(`\n${category}\n`))

      const toolChoices = tools.map((t) => ({
        name: `${chalk.bold(t.name)} — ${t.description}`,
        value: t.name,
      }))
      toolChoices.push({ name: chalk.dim('← Back'), value: '__back__' })

      const { selected } = await inquirer.prompt<{ selected: string }>([
        {
          type: 'list',
          name: 'selected',
          message: 'Select a tool to install:',
          choices: toolChoices,
          pageSize: 20,
        },
      ])

      if (selected === '__back__') return

      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Install ${selected}?`,
          default: true,
        },
      ])

      if (confirm) {
        // Dynamic import to avoid circular deps
        const { execSync } = await import('node:child_process')
        execSync(`node ${process.argv[1] ?? ''} install ${selected}`, { stdio: 'inherit' })
      }
    })
}
