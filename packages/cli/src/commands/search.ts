import { Command } from 'commander'
import chalk from 'chalk'
import { searchTools } from '../api/client.js'
import { findSimilarTools } from '../registry/tools.js'

const TYPE_BADGES: Record<string, string> = {
  mcp: chalk.magenta('mcp'),
  sdk: chalk.blue('sdk'),
  cli: chalk.green('cli'),
  api: chalk.yellow('api'),
  config: chalk.cyan('config'),
}

export function createSearchCommand(): Command {
  return new Command('search')
    .argument('<query>', 'Search query')
    .description('Search for tools in the registry')
    .action(async (query: string) => {
      // Search local + remote registry
      const matches = await findSimilarTools(query)
      if (matches.length > 0) {
        console.log()
        for (const tool of matches) {
          const badge = TYPE_BADGES[tool.type] ?? tool.type
          console.log(`  ${chalk.bold(tool.name)} ${chalk.dim('·')} ${badge}`)
          console.log(`  ${chalk.dim(tool.description)}`)
          console.log(`  ${chalk.dim('$')} stack install ${tool.name}`)
          console.log()
        }
        console.log(chalk.dim(`${matches.length.toString()} results`))
      }

      // Also search the API for tools not in cache
      try {
        const remote = await searchTools(query)
        const matchNames = new Set(matches.map((m) => m.name))
        const extra = remote.filter((t) => !matchNames.has(t.name))
        if (extra.length > 0) {
          console.log(chalk.cyan('\nAdditional results:'))
          for (const tool of extra) {
            console.log(`  ${chalk.bold(tool.name)} — ${tool.description}`)
          }
        }
      } catch {
        // Remote search is non-critical
      }

      if (matches.length === 0) {
        console.log(chalk.yellow(`\nNo tools found for "${query}". Try: stack browse`))
      }
    })
}
