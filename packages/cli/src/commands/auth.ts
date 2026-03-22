import { Command } from 'commander'
import chalk from 'chalk'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

function getTokenPath(): string {
  return join(homedir(), '.stack', 'auth-token')
}

async function readToken(): Promise<string | null> {
  try {
    const token = await readFile(getTokenPath(), 'utf-8')
    return token.trim() === '' ? null : token.trim()
  } catch {
    return null
  }
}

export function createLoginCommand(): Command {
  return new Command('login')
    .description('Authenticate with use.dev via GitHub OAuth')
    .action(async () => {
      // For MVP: simple token-based auth
      // Full OAuth flow will be implemented when use.dev backend is ready
      const { default: inquirer } = await import('inquirer')

      const { token } = await inquirer.prompt<{ token: string }>([
        {
          type: 'password',
          name: 'token',
          message: 'Enter your use.dev API token (from https://use.dev/settings/tokens):',
          mask: '*',
        },
      ])

      if (token.trim() === '') {
        console.log(chalk.yellow('No token provided.'))
        return
      }

      const tokenPath = getTokenPath()
      await mkdir(join(tokenPath, '..'), { recursive: true })
      await writeFile(tokenPath, token.trim(), { mode: 0o600 })

      console.log(chalk.green('✓ Logged in successfully. Token saved to ~/.stack/auth-token'))
    })
}

export function createLogoutCommand(): Command {
  return new Command('logout').description('Remove stored authentication').action(async () => {
    try {
      await rm(getTokenPath())
      console.log(chalk.green('✓ Logged out. Token removed.'))
    } catch {
      console.log(chalk.yellow('No active session found.'))
    }
  })
}

export function createWhoamiCommand(): Command {
  return new Command('whoami')
    .description('Show the currently authenticated user')
    .action(async () => {
      const token = await readToken()

      if (token === null) {
        console.log(chalk.yellow('Not logged in. Run "stack login" to authenticate.'))
        return
      }

      console.log(chalk.green(`✓ Authenticated (token: ${token.slice(0, 8)}...)`))
    })
}
