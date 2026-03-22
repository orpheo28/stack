import { Command } from 'commander'
import chalk from 'chalk'
import { searchTools } from '../api/client.js'
import { findSimilarTools } from '../registry/tools.js'

export function createSearchCommand(): Command {
  return new Command('search')
    .argument('<query>', 'Search query')
    .description('Search for tools in the registry')
    .action(async (query: string) => {
      // Search local registry first
      const local = findSimilarTools(query)
      if (local.length > 0) {
        console.log(chalk.cyan('\nLocal registry matches:'))
        for (const tool of local) {
          console.log(`  ${chalk.bold(tool.name)} — ${tool.displayName} (${tool.type})`)
          console.log(`    ${chalk.dim(`stack install ${tool.name}`)}`)
        }
      }

      // Search remote registry
      try {
        const remote = await searchTools(query)
        if (remote.length > 0) {
          console.log(chalk.cyan('\nRemote results:'))
          for (const tool of remote) {
            console.log(`  ${chalk.bold(tool.name)} — ${tool.description}`)
          }
        }
      } catch {
        // Remote search is non-critical
      }

      if (local.length === 0) {
        console.log(chalk.yellow(`No tools found for "${query}"`))
      }
    })
}
