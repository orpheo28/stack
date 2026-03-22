import { Command } from 'commander'
import chalk from 'chalk'
import { detectContext } from '../detectors/context.js'

export function createListCommand(): Command {
  return new Command('list')
    .alias('ls')
    .description('List detected clients and project context')
    .action(async () => {
      const ctx = await detectContext()

      console.log(chalk.cyan('\nDetected environment:'))

      if (ctx.clients.length === 0) {
        console.log(chalk.yellow('  No AI clients detected'))
      } else {
        for (const client of ctx.clients) {
          const badge = client.certainty === 'confirmed' ? chalk.green('✓') : chalk.yellow('?')
          console.log(
            `  ${badge} ${chalk.bold(client.name)} (tier ${client.tier.toString()}) → ${chalk.dim(client.configPath)}`,
          )
        }
      }

      console.log(`\n  Project: ${chalk.bold(ctx.projectType)}`)

      if (ctx.envFilePath !== null) {
        console.log(`  Env: ${chalk.dim(ctx.envFilePath)}`)
      }
    })
}
