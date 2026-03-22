import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { findTool } from '../registry/tools.js'
import { installTool } from './install.js'

// --- Presets ---

interface ToolPreset {
  readonly name: string
  readonly tools: readonly string[]
}

const NEED_PRESETS: readonly { label: string; value: string; tools: readonly ToolPreset[] }[] = [
  {
    label: 'Database',
    value: 'database',
    tools: [
      { name: 'Supabase (MCP + SDK)', tools: ['supabase'] },
      { name: 'Neon Postgres (MCP)', tools: ['neon'] },
      { name: 'Prisma (MCP + Client)', tools: ['prisma', 'prisma-client'] },
      { name: 'Drizzle ORM (SDK)', tools: ['drizzle'] },
      { name: 'MongoDB (MCP)', tools: ['mongodb'] },
      { name: 'PlanetScale (MCP)', tools: ['planetscale'] },
      { name: 'Turso (MCP)', tools: ['turso'] },
    ],
  },
  {
    label: 'Payments',
    value: 'payments',
    tools: [
      { name: 'Stripe (MCP + SDK)', tools: ['stripe', 'stripe-sdk'] },
      { name: 'Lemon Squeezy (SDK)', tools: ['lemonsqueezy'] },
      { name: 'Paddle (SDK)', tools: ['paddle'] },
    ],
  },
  {
    label: 'Auth',
    value: 'auth',
    tools: [{ name: 'Auth0 (MCP)', tools: ['auth0'] }],
  },
  {
    label: 'Email',
    value: 'email',
    tools: [
      { name: 'Resend (SDK)', tools: ['resend'] },
      { name: 'SendGrid (SDK)', tools: ['sendgrid'] },
      { name: 'Postmark (SDK)', tools: ['postmark'] },
    ],
  },
  {
    label: 'Monitoring',
    value: 'monitoring',
    tools: [
      { name: 'Sentry (MCP)', tools: ['sentry'] },
      { name: 'Datadog (MCP)', tools: ['datadog'] },
      { name: 'Axiom (MCP)', tools: ['axiom'] },
      { name: 'Grafana (MCP)', tools: ['grafana'] },
    ],
  },
  {
    label: 'AI / LLM',
    value: 'ai',
    tools: [
      { name: 'Anthropic (SDK)', tools: ['anthropic'] },
      { name: 'OpenAI (SDK)', tools: ['openai'] },
      { name: 'Vercel AI SDK', tools: ['vercel-ai'] },
      { name: 'Google Gemini (SDK)', tools: ['google-ai'] },
      { name: 'Groq (SDK)', tools: ['groq'] },
      { name: 'Mistral (SDK)', tools: ['mistral'] },
    ],
  },
  {
    label: 'Search',
    value: 'search',
    tools: [
      { name: 'Exa (MCP)', tools: ['exa'] },
      { name: 'Tavily (MCP)', tools: ['tavily'] },
      { name: 'Brave Search (MCP)', tools: ['brave-search'] },
      { name: 'Perplexity (MCP)', tools: ['perplexity'] },
    ],
  },
  {
    label: 'Browser automation',
    value: 'browser',
    tools: [
      { name: 'Playwright (MCP)', tools: ['playwright'] },
      { name: 'Browserbase (MCP)', tools: ['browserbase'] },
      { name: 'Firecrawl (MCP)', tools: ['firecrawl'] },
    ],
  },
  {
    label: 'Project tools',
    value: 'project',
    tools: [
      { name: 'GitHub (MCP)', tools: ['github'] },
      { name: 'Linear (MCP)', tools: ['linear'] },
      { name: 'Notion (MCP)', tools: ['notion'] },
      { name: 'Slack (MCP)', tools: ['slack'] },
      { name: 'Figma (MCP)', tools: ['figma'] },
    ],
  },
]

// --- Command ---

export function createInitCommand(): Command {
  return new Command('init')
    .description('Interactively set up your project with the tools you need')
    .action(async () => {
      const { default: inquirer } = await import('inquirer')

      console.log(chalk.cyan('\n  stack init\n'))
      console.log(chalk.dim('  Set up your project with the right tools.\n'))

      // Step 1: What do you need?
      const { needs } = await inquirer.prompt<{ needs: string[] }>([
        {
          type: 'checkbox',
          name: 'needs',
          message: 'What do you need?',
          choices: NEED_PRESETS.map((p) => ({ name: p.label, value: p.value })),
        },
      ])

      if (needs.length === 0) {
        console.log(chalk.yellow('\nNo tools selected. Run stack browse to explore.'))
        return
      }

      // Step 2: For each need, pick specific tools
      const selectedTools: string[] = []

      for (const need of needs) {
        const preset = NEED_PRESETS.find((p) => p.value === need)
        if (preset === undefined) continue

        if (preset.tools.length === 1) {
          // Only one option — auto-select
          const single = preset.tools[0]
          if (single !== undefined) {
            selectedTools.push(...single.tools)
          }
          continue
        }

        const { picked } = await inquirer.prompt<{ picked: string[] }>([
          {
            type: 'checkbox',
            name: 'picked',
            message: `Which ${preset.label.toLowerCase()}?`,
            choices: preset.tools.map((t) => ({
              name: t.name,
              value: t.tools.join(','),
              checked: preset.tools.indexOf(t) === 0, // First option checked by default
            })),
          },
        ])

        for (const p of picked) {
          selectedTools.push(...p.split(','))
        }
      }

      const unique = [...new Set(selectedTools)]

      if (unique.length === 0) {
        console.log(chalk.yellow('\nNo tools selected.'))
        return
      }

      // Step 3: Confirm
      console.log(chalk.bold(`\n  Will install ${unique.length.toString()} tools:`))
      for (const name of unique) {
        console.log(`    ${chalk.green('+')} ${name}`)
      }
      console.log()

      const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
        { type: 'confirm', name: 'proceed', message: 'Install all?', default: true },
      ])

      if (!proceed) return

      // Step 4: Install everything
      const spinner = ora(`Installing ${unique.length.toString()} tools...`).start()
      const start = Date.now()
      const cwd = process.cwd()

      const results = await Promise.allSettled(
        unique.map(async (name) => {
          const tool = await findTool(name)
          if (tool !== undefined) {
            return installTool(tool, cwd, { skipNpmInstall: false })
          }
          return null
        }),
      )

      spinner.stop()

      const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value !== null).length
      const failed = results.filter((r) => r.status === 'rejected').length
      const duration = ((Date.now() - start) / 1000).toFixed(1)

      console.log(chalk.green(`\n✓ ${succeeded.toString()} tools installed in ${duration}s`))

      if (failed > 0) {
        console.log(chalk.red(`  ${failed.toString()} tools failed`))
      }

      // Next steps summary
      console.log(chalk.bold('\n  Next steps:'))
      console.log(`    1. Fill in your API keys in ${chalk.cyan('.env')}`)
      console.log(`    2. Restart your AI client (Claude Desktop, Cursor, etc.)`)
      console.log(`    3. Start building!`)
      console.log()
    })
}
