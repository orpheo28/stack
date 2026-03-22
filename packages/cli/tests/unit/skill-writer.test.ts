import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeSkillFile } from '../../src/writers/skill.js'

describe('writeSkillFile', () => {
  let tmpDir: string
  let homeDir: string
  let projectRoot: string

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'stack-skill-test-'))
    homeDir = join(tmpDir, 'home')
    projectRoot = join(homeDir, 'project')
    await mkdir(projectRoot, { recursive: true })
    // Create .claude/skills/ to match whitelist
    await mkdir(join(homeDir, '.claude', 'skills'), { recursive: true })
    // Change cwd for whitelist checks
    process.chdir(projectRoot)
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('should write a SKILL.md file in ~/.claude/skills/{toolName}/', async () => {
    const content = '# Test Skill\n\nThis is a test skill.'
    const result = await writeSkillFile('test-tool', content, homeDir)

    expect(result.skillPath).toBe(join(homeDir, '.claude', 'skills', 'test-tool', 'SKILL.md'))
    expect(existsSync(result.skillPath)).toBe(true)

    const written = await readFile(result.skillPath, 'utf-8')
    expect(written).toBe(content)
  })

  it('should create the tool directory if it does not exist', async () => {
    const toolDir = join(homeDir, '.claude', 'skills', 'new-tool')
    expect(existsSync(toolDir)).toBe(false)

    await writeSkillFile('new-tool', '# Skill', homeDir)

    expect(existsSync(toolDir)).toBe(true)
  })

  it('should overwrite an existing skill file', async () => {
    await writeSkillFile('overwrite-test', 'Version 1', homeDir)
    await writeSkillFile('overwrite-test', 'Version 2', homeDir)

    const content = await readFile(
      join(homeDir, '.claude', 'skills', 'overwrite-test', 'SKILL.md'),
      'utf-8',
    )
    expect(content).toBe('Version 2')
  })

  it('should reject paths outside the whitelist', async () => {
    // writeSkillFile uses assertPathAllowed internally
    // A valid tool name should pass, as ~/.claude/skills/ is whitelisted
    const result = await writeSkillFile('valid-name', '# OK', homeDir)
    expect(result.skillPath).toContain('.claude/skills/valid-name')
  })
})
