import { Command } from 'commander'
import chalk from 'chalk'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { exec } from 'node:child_process'
import { StackError } from '../types/errors.js'
import { getValidToken, saveFullAuth, type FullAuthData } from '../utils/auth-token.js'

// --- Auth file management ---

// Re-export FullAuthData as AuthData for backward compat
type AuthData = FullAuthData

function getAuthPath(homeDir?: string): string {
  return join(homeDir ?? homedir(), '.stack', 'auth.json')
}

// Legacy token path — for backward compat
function getLegacyTokenPath(homeDir?: string): string {
  return join(homeDir ?? homedir(), '.stack', 'auth-token')
}

export async function readAuth(homeDir?: string): Promise<AuthData | null> {
  // Try new format first
  try {
    const raw = await readFile(getAuthPath(homeDir), 'utf-8')
    const data = JSON.parse(raw) as AuthData
    if (typeof data.token === 'string' && data.token !== '') return data
    if (typeof data.access_token === 'string' && data.access_token !== '') return data
  } catch {
    // Fall through to legacy
  }

  // Try legacy token
  try {
    const token = await readFile(getLegacyTokenPath(homeDir), 'utf-8')
    if (token.trim() !== '') {
      return { user_id: '', username: '', token: token.trim() }
    }
  } catch {
    // No auth
  }

  return null
}

/** Returns the best available token, auto-refreshing if needed. */
export async function readToken(homeDir?: string): Promise<string | null> {
  return getValidToken(homeDir)
}

async function saveAuth(data: AuthData, homeDir?: string): Promise<void> {
  await saveFullAuth(data, homeDir)
}

async function clearAuth(homeDir?: string): Promise<void> {
  try {
    await rm(getAuthPath(homeDir))
  } catch {
    /* ignore */
  }
  try {
    await rm(getLegacyTokenPath(homeDir))
  } catch {
    /* ignore */
  }
}

// --- Browser opening ---

function openBrowser(url: string): boolean {
  const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open'

  try {
    exec(`${cmd} "${url}"`)
    return true
  } catch {
    return false
  }
}

// --- API ---

function getAppUrl(): string {
  return process.env['STACK_APP_URL'] ?? 'https://use.dev'
}

function getApiUrl(): string {
  return process.env['STACK_API_URL'] ?? 'https://use.dev/api'
}

// --- Browser OAuth flow ---

interface OAuthResult {
  readonly token: string
  readonly state: string
}

async function waitForCallback(
  port: number,
  expectedState: string,
  timeoutMs: number,
): Promise<OAuthResult> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port.toString()}`)

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token')
        const state = url.searchParams.get('state')

        if (state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(
            '<html><body><h2>Authentication failed</h2><p>State mismatch. Please try again.</p></body></html>',
          )
          reject(new StackError('STACK_006', 'OAuth state mismatch. Possible CSRF attack.'))
          server.close()
          return
        }

        if (token === null || token === '') {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(
            '<html><body><h2>Authentication failed</h2><p>No token received.</p></body></html>',
          )
          reject(new StackError('STACK_006', 'No token received from OAuth callback.'))
          server.close()
          return
        }

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<html><body><h2>Authenticated!</h2><p>You can close this tab and return to your terminal.</p></body></html>',
        )
        resolve({ token, state })
        server.close()
        return
      }

      res.writeHead(404)
      res.end()
    })

    const timeout = setTimeout(() => {
      server.close()
      reject(new StackError('STACK_006', 'Login timed out. Please try again.'))
    }, timeoutMs)

    server.on('close', () => {
      clearTimeout(timeout)
    })

    server.listen(port, '127.0.0.1')
  })
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (addr !== null && typeof addr === 'object') {
        const port = addr.port
        srv.close(() => {
          resolve(port)
        })
      } else {
        srv.close(() => {
          reject(new Error('Could not find free port'))
        })
      }
    })
    srv.on('error', reject)
  })
}

async function exchangeToken(cliToken: string): Promise<AuthData> {
  const url = `${getApiUrl()}/auth/cli/exchange`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'stackdev-cli' },
    body: JSON.stringify({ token: cliToken }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new StackError(
      'STACK_006',
      `Token exchange failed: ${response.status.toString()} ${text}`,
    )
  }

  const data = (await response.json()) as {
    user_id: string
    username: string
    access_token?: string | null
    refresh_token?: string | null
    expires_at?: number | null
  }

  return {
    user_id: data.user_id,
    username: data.username,
    // Legacy token field — kept for backward compat (used if access_token absent)
    token: cliToken,
    // Supabase session tokens — present when browser OAuth was used
    access_token: data.access_token ?? undefined,
    refresh_token: data.refresh_token ?? undefined,
    expires_at: data.expires_at ?? undefined,
  }
}

// --- Fallback: token paste ---

async function loginWithTokenPaste(): Promise<void> {
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

  await saveAuth({ user_id: '', username: '', token: token.trim() })
  console.log(chalk.green('✓ Logged in successfully.'))
}

// --- Commands ---

export function createLoginCommand(): Command {
  return new Command('login')
    .description('Authenticate with use.dev via GitHub OAuth')
    .option('--token', 'Use token paste instead of browser login')
    .action(async (opts: { token?: boolean }) => {
      // Fallback mode
      if (opts.token === true) {
        await loginWithTokenPaste()
        return
      }

      // Browser OAuth flow
      const spinner = (await import('ora')).default
      const spin = spinner('Starting login...').start()

      try {
        const port = await findFreePort()
        const state = randomBytes(32).toString('hex')

        const authUrl = `${getAppUrl()}/auth/cli?port=${port.toString()}&state=${encodeURIComponent(state)}`

        spin.text = 'Opening browser...'

        const opened = openBrowser(authUrl)
        if (!opened) {
          spin.stop()
          console.log(chalk.yellow('Could not open browser. Falling back to token paste.'))
          await loginWithTokenPaste()
          return
        }

        spin.text = 'Waiting for authentication (press Ctrl+C to cancel)...'

        const result = await waitForCallback(port, state, 120_000)

        spin.text = 'Exchanging token...'

        const authData = await exchangeToken(result.token)
        await saveAuth(authData)

        spin.stop()
        console.log(chalk.green(`✓ Logged in as ${chalk.bold('@' + authData.username)}`))
      } catch (error) {
        spin.stop()
        if (error instanceof StackError) {
          // Timeout or other auth error — fall back to paste
          console.log(chalk.yellow(`\n${error.message}`))
          console.log(chalk.dim('Falling back to token paste...'))
          await loginWithTokenPaste()
        } else {
          throw error
        }
      }
    })
}

export function createLogoutCommand(): Command {
  return new Command('logout').description('Remove stored authentication').action(async () => {
    await clearAuth()
    console.log(chalk.green('✓ Logged out. Credentials removed.'))
  })
}

export function createWhoamiCommand(): Command {
  return new Command('whoami')
    .description('Show the currently authenticated user')
    .action(async () => {
      const auth = await readAuth()

      if (auth === null) {
        console.log(chalk.yellow('Not logged in. Run "stack login" to authenticate.'))
        return
      }

      if (auth.username !== '' && auth.username !== 'unknown') {
        console.log(chalk.green(`✓ Logged in as ${chalk.bold('@' + auth.username)}`))
      } else {
        console.log(chalk.green(`✓ Authenticated (token: ${auth.token.slice(0, 8)}...)`))
      }
    })
}
