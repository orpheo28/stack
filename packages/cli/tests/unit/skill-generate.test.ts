import { describe, it, expect } from 'vitest'
import { generateSkillFromMcp } from '../../src/writers/skill.js'
import type { ToolDefinition } from '../../src/registry/tools.js'

const mockTool: ToolDefinition = {
  name: 'test-mcp',
  displayName: 'Test MCP',
  description: 'A test MCP server for unit testing',
  type: 'mcp',
  source: 'npm:@test/mcp-server',
  mcpConfig: { command: 'npx', args: ['-y', '@test/mcp-server'] },
  envVars: [
    { key: 'TEST_API_KEY', placeholder: '<your-test-key>' },
    { key: 'TEST_SECRET', placeholder: '<your-test-secret>' },
  ],
}

describe('generateSkillFromMcp', () => {
  it('should include the tool display name as heading', () => {
    const result = generateSkillFromMcp(mockTool)
    expect(result).toContain('# Test MCP')
  })

  it('should include the description', () => {
    const result = generateSkillFromMcp(mockTool)
    expect(result).toContain('A test MCP server for unit testing')
  })

  it('should include MCPorter commands with correct server args', () => {
    const result = generateSkillFromMcp(mockTool)
    expect(result).toContain('npx mcporter tools -y @test/mcp-server')
    expect(result).toContain('npx mcporter call -y @test/mcp-server <tool-name>')
    expect(result).toContain('npx mcporter schema -y @test/mcp-server <tool-name>')
  })

  it('should include environment variables', () => {
    const result = generateSkillFromMcp(mockTool)
    expect(result).toContain('`TEST_API_KEY`')
    expect(result).toContain('`TEST_SECRET`')
  })

  it('should include "When to use" section', () => {
    const result = generateSkillFromMcp(mockTool)
    expect(result).toContain('## When to use')
  })

  it('should include cliCommand section when present', () => {
    const toolWithCli: ToolDefinition = {
      ...mockTool,
      cliCommand: 'test-cli',
    }
    const result = generateSkillFromMcp(toolWithCli)
    expect(result).toContain('## Direct CLI')
    expect(result).toContain('`test-cli`')
    expect(result).toContain('test-cli --help')
  })

  it('should not include Direct CLI section when cliCommand is absent', () => {
    const result = generateSkillFromMcp(mockTool)
    expect(result).not.toContain('## Direct CLI')
  })

  it('should handle tool with no env vars', () => {
    const toolNoEnv: ToolDefinition = {
      ...mockTool,
      envVars: undefined,
    }
    const result = generateSkillFromMcp(toolNoEnv)
    expect(result).not.toContain('## Environment variables')
  })

  it('should produce valid markdown with bash code blocks', () => {
    const result = generateSkillFromMcp(mockTool)
    const openBlocks = (result.match(/```bash/g) ?? []).length
    const closeBlocks = (result.match(/```\n/g) ?? []).length
    expect(openBlocks).toBeGreaterThan(0)
    expect(openBlocks).toBe(closeBlocks)
  })
})
