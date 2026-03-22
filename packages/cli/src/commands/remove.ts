import { Command } from 'commander'
import chalk from 'chalk'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { detectContext } from '../detectors/context.js'
import { readStackJson } from '../utils/stack-json.js'
import { atomicWrite } from '../utils/atomic-write.js'

async function removeMcpEntry(configPath: string, toolName: string): Promise<boolean> {
  try {
    const raw = await readFile(configPath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null) return false
    const config = parsed as Record<string, unknown>
    const servers = config['mcpServers'] as Record<string, unknown> | undefined

    if (servers === undefined || !(toolName in servers)) return false

    const filtered = Object.fromEntries(Object.entries(servers).filter(([key]) => key !== toolName))
    config['mcpServers'] = filtered

    await atomicWrite(configPath, JSON.stringify(config, null, 2), process.cwd(), {
      homeDir: homedir(),
    })
    return true
  } catch {
    return false
  }
}

export function createRemoveCommand(): Command {
  return new Command('remove')
    .argument('<name>', 'Tool name to remove')
    .description('Remove a tool from your setup')
    .action(async (name: string) => {
      const ctx = await detectContext()
      let removed = false

      // Remove from MCP configs
      for (const client of ctx.clients) {
        if (await removeMcpEntry(client.configPath, name)) {
          console.log(
            chalk.green(`  ✓ Removed from ${client.name} → ${chalk.dim(client.configPath)}`),
          )
          removed = true
        }
      }

      // Remove from stack.json
      const cwd = process.cwd()
      const manifest = await readStackJson(cwd)
      if (manifest !== null && name in manifest.tools) {
        const tools = Object.fromEntries(
          Object.entries(manifest.tools).filter(([key]) => key !== name),
        )
        const updated = { ...manifest, tools }
        await atomicWrite(join(cwd, 'stack.json'), JSON.stringify(updated, null, 2) + '\n', cwd)
        console.log(chalk.green(`  ✓ Removed from stack.json`))
        removed = true
      }

      if (removed) {
        console.log(chalk.green(`\n✓ ${name} removed`))
      } else {
        console.log(chalk.yellow(`${name} not found in any configuration`))
      }
    })
}
