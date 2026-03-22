import { Command } from 'commander'
import chalk from 'chalk'
import { searchTools } from '../api/client.js'
import { findSimilarTools } from '../registry/tools.js'

export function createSearchCommand(): Command {
  return new Command('search')
    .argument('<query>', 'Search query')
    .description('Search for tools in the registry')
    .action(async (query: string) => {
      // Search local + remote registry
      const matches = await findSimilarTools(query)
      if (matches.length > 0) {
        console.log(chalk.cyan('\nRegistry matches:'))
        for (const tool of matches) {
          console.log(`  ${chalk.bold(tool.name)} — ${tool.displayName} (${tool.type})`)
          console.log(`    ${chalk.dim(`stack install ${tool.name}`)}`)
        }
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
        console.log(chalk.yellow(`No tools found for "${query}"`))
      }
    })
}
