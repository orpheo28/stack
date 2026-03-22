import { Command } from 'commander'
import chalk from 'chalk'
import { rollbackLast, listBackups } from '../security/backup.js'
import { isStackError } from '../types/errors.js'

export function createRollbackCommand(): Command {
  return new Command('rollback')
    .description('Rollback the last install operation')
    .option('--list', 'List all available backups')
    .action(async (options: { list?: boolean }) => {
      if (options.list === true) {
        const records = await listBackups()

        if (records.length === 0) {
          console.log(chalk.yellow('No backups found.'))
          return
        }

        console.log(chalk.cyan('\nAvailable backups:'))
        for (const record of records) {
          const type = record.type === 'created' ? chalk.yellow('new') : chalk.blue('modified')
          console.log(`  ${type} ${chalk.dim(record.timestamp)} → ${record.originalPath}`)
        }
        return
      }

      try {
        const record = await rollbackLast()
        console.log(chalk.green(`✓ Rolled back: ${record.originalPath}`))
      } catch (error) {
        if (isStackError(error)) {
          console.log(chalk.yellow(error.suggestion))
        } else {
          throw error
        }
      }
    })
}
