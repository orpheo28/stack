import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { atomicWrite } from '../utils/atomic-write.js'
import { assertPathAllowed } from '../security/whitelist.js'
import type { ToolDefinition } from '../registry/tools.js'

// --- Types ---

export interface SkillWriteResult {
  readonly skillPath: string
}

// --- Skill generation ---

/**
 * Auto-generate a SKILL.md from a ToolDefinition's MCP config.
 * Uses the MCPorter pattern: `npx mcporter call <server> <tool> <params>`
 * This allows ANY MCP server to be used as a CLI skill with zero manual work.
 */
export function generateSkillFromMcp(tool: ToolDefinition): string {
  const lines: string[] = []

  lines.push(`# ${tool.displayName}`)
  lines.push('')
  lines.push(tool.description)
  lines.push('')

  // MCPorter commands
  if (tool.mcpConfig !== undefined) {
    const serverArgs = tool.mcpConfig.args.join(' ')

    lines.push('## Available tools')
    lines.push('')
    lines.push('List all available tools from this MCP server:')
    lines.push('```bash')
    lines.push(`npx mcporter tools ${serverArgs}`)
    lines.push('```')
    lines.push('')
    lines.push('## Call a tool')
    lines.push('')
    lines.push('Execute a specific tool:')
    lines.push('```bash')
    lines.push(`npx mcporter call ${serverArgs} <tool-name> '{"param": "value"}'`)
    lines.push('```')
    lines.push('')
    lines.push('## Get tool schema')
    lines.push('')
    lines.push('Get the parameter schema for a specific tool:')
    lines.push('```bash')
    lines.push(`npx mcporter schema ${serverArgs} <tool-name>`)
    lines.push('```')
    lines.push('')
  }

  // CLI command if available
  if (tool.cliCommand !== undefined) {
    lines.push('## Direct CLI')
    lines.push('')
    lines.push(`You can also use the \`${tool.cliCommand}\` CLI directly:`)
    lines.push('```bash')
    lines.push(`${tool.cliCommand} --help`)
    lines.push('```')
    lines.push('')
  }

  // Environment variables
  if (tool.envVars !== undefined && tool.envVars.length > 0) {
    lines.push('## Environment variables')
    lines.push('')
    for (const env of tool.envVars) {
      lines.push(`- \`${env.key}\` — required`)
    }
    lines.push('')
    lines.push('Set these in your `.env` file before using this tool.')
    lines.push('')
  }

  // When to use
  lines.push('## When to use')
  lines.push('')
  lines.push(`Use this skill when you need to interact with ${tool.displayName}.`)
  lines.push(
    `First run \`npx mcporter tools ${tool.mcpConfig?.args.join(' ') ?? tool.name}\` to discover available operations.`,
  )
  lines.push('')

  return lines.join('\n')
}

// --- Public API ---

/**
 * Write a skill file (.md) for a tool into ~/.claude/skills/{toolName}/SKILL.md
 * This teaches the AI agent how to use a CLI tool via bash.
 * Zero overhead — loaded on-demand by Claude Code when the agent needs it.
 */
export async function writeSkillFile(
  toolName: string,
  skillContent: string,
  homeDir?: string,
): Promise<SkillWriteResult> {
  const home = homeDir ?? homedir()
  const skillDir = join(home, '.claude', 'skills', toolName)
  const skillPath = join(skillDir, 'SKILL.md')

  // Whitelist check
  assertPathAllowed(skillPath, process.cwd(), homeDir)

  // Ensure directory exists
  await mkdir(skillDir, { recursive: true })

  // Write skill file using atomic write pattern
  await atomicWrite(skillPath, skillContent, process.cwd(), { homeDir })

  return { skillPath }
}
