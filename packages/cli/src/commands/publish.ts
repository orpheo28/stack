import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { publishSetup } from '../api/client.js'
import { readStackJson } from '../utils/stack-json.js'
import { readToken } from './auth.js'

export function createPublishCommand(): Command {
  return new Command('publish').description('Publish your setup to use.dev').action(async () => {
    const cwd = process.cwd()
    const manifest = await readStackJson(cwd)

    if (manifest === null) {
      console.log(chalk.yellow('No stack.json found. Run "stack install" first to set up tools.'))
      return
    }

    // STACK_AUTH_TOKEN env var takes precedence (CI/CD usage),
    // otherwise use the stored OAuth token from `stack login`
    const token = process.env['STACK_AUTH_TOKEN'] ?? (await readToken())
    if (token === null || token === '') {
      console.log(chalk.yellow('Authentication required. Run "stack login" first.'))
      return
    }

    const spinner = ora('Publishing your setup...').start()

    try {
      const url = await publishSetup(manifest, token)
      spinner.succeed(chalk.green(`Published! View your profile: ${url}`))
    } catch (error) {
      spinner.fail('Failed to publish')
      throw error
    }
  })
}
