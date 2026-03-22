import { mkdir, rm, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { StackError } from '../types/errors.js'
import { assertPathAllowed } from '../security/whitelist.js'

// --- Types ---

export interface SkillsWriteResult {
  readonly skillsDir: string
  readonly skillCount: number
}

// --- Helpers ---

async function cloneRepo(repoUrl: string, destDir: string): Promise<void> {
  const { exec: execCb } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execAsync = promisify(execCb)

  try {
    await execAsync(`git clone --depth 1 "${repoUrl}" "${destDir}"`, {
      timeout: 60_000,
    })
  } catch (error) {
    throw new StackError(
      'STACK_004',
      `Failed to clone ${repoUrl}. Check the URL and your internet connection.`,
      error instanceof Error ? error : undefined,
    )
  }
}

// --- Public API ---

/**
 * Install skills from a GitHub repo into ~/.claude/skills/<repo-name>/
 * Uses atomic write pattern: clone to tmp → validate → rename to final location.
 */
export async function writeSkills(
  owner: string,
  repo: string,
  homeDir?: string,
): Promise<SkillsWriteResult> {
  const home = homeDir ?? homedir()
  const skillsBaseDir = join(home, '.claude', 'skills')
  const finalDir = join(skillsBaseDir, repo)

  // Whitelist check
  assertPathAllowed(finalDir, process.cwd(), homeDir)

  // Clone to temp directory first (atomic pattern)
  const tmpDir = join(tmpdir(), `stack-skills-${Date.now().toString()}`)

  try {
    const repoUrl = `https://github.com/${owner}/${repo}.git`
    await cloneRepo(repoUrl, tmpDir)

    // Remove .git directory — we don't need the history
    const gitDir = join(tmpDir, '.git')
    if (existsSync(gitDir)) {
      await rm(gitDir, { recursive: true, force: true })
    }

    // Count skill files
    const { readdir } = await import('node:fs/promises')
    const entries = await readdir(tmpDir, { recursive: true })
    const skillFiles = entries.filter(
      (e) => typeof e === 'string' && (e.endsWith('.md') || e.endsWith('.ts') || e.endsWith('.js')),
    )

    // Ensure parent directory exists
    await mkdir(skillsBaseDir, { recursive: true })

    // Remove existing skills directory if present
    if (existsSync(finalDir)) {
      await rm(finalDir, { recursive: true, force: true })
    }

    // Atomic move from tmp to final location
    await rename(tmpDir, finalDir)

    return {
      skillsDir: finalDir,
      skillCount: skillFiles.length,
    }
  } catch (error) {
    // Cleanup temp dir on failure
    if (existsSync(tmpDir)) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {
        // Ignore cleanup errors
      })
    }

    if (error instanceof StackError) throw error
    throw new StackError(
      'STACK_004',
      `Failed to install skills: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
