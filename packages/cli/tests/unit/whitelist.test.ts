import { describe, it, expect } from 'vitest'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { assertPathAllowed, isPathAllowed } from '../../src/security/whitelist.js'
import { isStackError } from '../../src/types/errors.js'

const home = homedir()
const projectRoot = '/Users/dev/my-project'

describe('isPathAllowed', () => {
  // --- Tier 1: MCP config files (exact match) ---

  it('should allow Claude Desktop config (macOS)', () => {
    const configPath = join(
      home,
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json',
    )
    expect(isPathAllowed(configPath, projectRoot)).toBe(true)
  })

  it('should allow .cursor/mcp.json in home', () => {
    expect(isPathAllowed(join(home, '.cursor', 'mcp.json'), projectRoot)).toBe(true)
  })

  it('should allow .windsurfrules in home', () => {
    expect(isPathAllowed(join(home, '.windsurfrules'), projectRoot)).toBe(true)
  })

  // --- Project-relative paths (exact match) ---

  it('should allow .cursorrules in project', () => {
    expect(isPathAllowed(join(projectRoot, '.cursorrules'), projectRoot)).toBe(true)
  })

  it('should allow CLAUDE.md in project', () => {
    expect(isPathAllowed(join(projectRoot, 'CLAUDE.md'), projectRoot)).toBe(true)
  })

  it('should allow .env in project', () => {
    expect(isPathAllowed(join(projectRoot, '.env'), projectRoot)).toBe(true)
  })

  it('should allow .env.local in project', () => {
    expect(isPathAllowed(join(projectRoot, '.env.local'), projectRoot)).toBe(true)
  })

  it('should allow stack.json in project', () => {
    expect(isPathAllowed(join(projectRoot, 'stack.json'), projectRoot)).toBe(true)
  })

  // --- Shell configs (exact match) ---

  it('should allow .zshrc', () => {
    expect(isPathAllowed(join(home, '.zshrc'), projectRoot)).toBe(true)
  })

  it('should allow .bashrc', () => {
    expect(isPathAllowed(join(home, '.bashrc'), projectRoot)).toBe(true)
  })

  // --- Prefix match: ~/.stack/ ---

  it('should allow files under ~/.stack/', () => {
    expect(isPathAllowed(join(home, '.stack', 'backups', 'file.bak'), projectRoot)).toBe(true)
  })

  it('should allow ~/.stack/backup-manifest.json', () => {
    expect(isPathAllowed(join(home, '.stack', 'backup-manifest.json'), projectRoot)).toBe(true)
  })

  it('should allow deeply nested ~/.stack/ paths', () => {
    expect(isPathAllowed(join(home, '.stack', 'a', 'b', 'c', 'deep.json'), projectRoot)).toBe(true)
  })

  // --- Prefix match: <project>/src/lib/ ---

  it('should allow <project>/src/lib/stripe.ts', () => {
    expect(isPathAllowed(join(projectRoot, 'src', 'lib', 'stripe.ts'), projectRoot)).toBe(true)
  })

  it('should allow <project>/src/lib/supabase.ts', () => {
    expect(isPathAllowed(join(projectRoot, 'src', 'lib', 'supabase.ts'), projectRoot)).toBe(true)
  })

  // --- BLOCKED paths ---

  it('should block /etc/passwd', () => {
    expect(isPathAllowed('/etc/passwd', projectRoot)).toBe(false)
  })

  it('should block /usr/local/bin/something', () => {
    expect(isPathAllowed('/usr/local/bin/something', projectRoot)).toBe(false)
  })

  it('should block ~/.ssh/authorized_keys', () => {
    expect(isPathAllowed(join(home, '.ssh', 'authorized_keys'), projectRoot)).toBe(false)
  })

  it('should block random home directory files', () => {
    expect(isPathAllowed(join(home, '.npmrc'), projectRoot)).toBe(false)
  })

  it('should block files in project root that are not whitelisted', () => {
    expect(isPathAllowed(join(projectRoot, 'package.json'), projectRoot)).toBe(false)
  })

  it('should block <project>/src/index.ts (only src/lib/ is allowed)', () => {
    expect(isPathAllowed(join(projectRoot, 'src', 'index.ts'), projectRoot)).toBe(false)
  })

  // --- Path traversal attacks ---

  it('should block path traversal via ../../../.ssh/', () => {
    const malicious = join(projectRoot, '..', '..', '..', '.ssh', 'authorized_keys')
    expect(isPathAllowed(malicious, projectRoot)).toBe(false)
  })

  it('should block path traversal in stack.json path', () => {
    const malicious = join(projectRoot, '..', 'other-project', 'stack.json')
    expect(isPathAllowed(malicious, projectRoot)).toBe(false)
  })

  it('should block traversal attempting to escape src/lib/', () => {
    const malicious = join(projectRoot, 'src', 'lib', '..', '..', '.env.production')
    expect(isPathAllowed(malicious, projectRoot)).toBe(false)
  })
})

describe('assertPathAllowed', () => {
  it('should not throw for allowed paths', () => {
    expect(() => {
      assertPathAllowed(join(projectRoot, 'CLAUDE.md'), projectRoot)
    }).not.toThrow()
  })

  it('should throw StackError with STACK_009 for blocked paths', () => {
    try {
      assertPathAllowed('/etc/passwd', projectRoot)
      expect.fail('Should have thrown')
    } catch (error: unknown) {
      expect(isStackError(error)).toBe(true)
      if (isStackError(error)) {
        expect(error.code).toBe('STACK_009')
      }
    }
  })

  it('should include the blocked path in the suggestion', () => {
    try {
      assertPathAllowed('/etc/shadow', projectRoot)
      expect.fail('Should have thrown')
    } catch (error: unknown) {
      if (isStackError(error)) {
        expect(error.suggestion).toContain('/etc/shadow')
      }
    }
  })
})
