import { describe, it, expect } from 'vitest'
import { REGISTRY } from '../../src/registry/tools.js'
import { generateSkillFromMcp } from '../../src/writers/skill.js'

describe('skill mode — registry integration', () => {
  const SKILL_TOOLS = [
    'stripe',
    'supabase',
    'vercel',
    'github',
    'sentry',
    'playwright',
    'docker',
    'prisma',
    'context7',
  ]

  it('should have installMode "both" for skill-enabled tools', () => {
    for (const name of SKILL_TOOLS) {
      const tool = REGISTRY.get(name)
      expect(tool, `${name} should exist`).toBeDefined()
      expect(tool?.installMode, `${name} should have installMode "both"`).toBe('both')
    }
  })

  it('should have skillFile content for skill-enabled tools', () => {
    for (const name of SKILL_TOOLS) {
      const tool = REGISTRY.get(name)
      expect(tool?.skillFile, `${name} should have skillFile`).toBeDefined()
      expect(tool?.skillFile?.length, `${name} skillFile should not be empty`).toBeGreaterThan(50)
      expect(tool?.skillFile, `${name} skillFile should contain CLI commands`).toContain('```bash')
    }
  })

  it('should have cliCommand for skill-enabled tools', () => {
    for (const name of SKILL_TOOLS) {
      const tool = REGISTRY.get(name)
      expect(tool?.cliCommand, `${name} should have cliCommand`).toBeDefined()
      expect(tool?.cliCommand?.length, `${name} cliCommand should not be empty`).toBeGreaterThan(0)
    }
  })

  it('should still have mcpConfig for backward compatibility', () => {
    for (const name of SKILL_TOOLS) {
      const tool = REGISTRY.get(name)
      expect(tool?.mcpConfig, `${name} should still have mcpConfig`).toBeDefined()
    }
  })

  it('should have "When to use" section in all skill files', () => {
    for (const name of SKILL_TOOLS) {
      const tool = REGISTRY.get(name)
      expect(
        tool?.skillFile?.includes('When to use'),
        `${name} skillFile should have "When to use" section`,
      ).toBe(true)
    }
  })

  it('should not have installMode on tools without skillFile', () => {
    for (const [name, tool] of REGISTRY) {
      if (tool.skillFile === undefined) {
        expect(
          tool.installMode,
          `${name} without skillFile should not have installMode`,
        ).toBeUndefined()
      }
    }
  })

  it('should auto-generate valid skill for ALL MCP tools via generateSkillFromMcp', () => {
    for (const [name, tool] of REGISTRY) {
      if (tool.mcpConfig !== undefined) {
        const skill = generateSkillFromMcp(tool)
        expect(skill.length, `${name} auto-generated skill should not be empty`).toBeGreaterThan(50)
        expect(skill, `${name} skill should contain mcporter`).toContain('mcporter')
        expect(skill, `${name} skill should contain tool name`).toContain(tool.displayName)
        expect(skill, `${name} skill should have bash blocks`).toContain('```bash')
      }
    }
  })
})
