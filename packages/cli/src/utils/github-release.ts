import { rename, mkdir, rm } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, platform, arch } from 'node:os'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { z } from 'zod'
import { StackError } from '../types/errors.js'
import { computeHash } from '../security/verify.js'
import { readFile } from 'node:fs/promises'

// --- Types ---

const GithubAssetSchema = z.object({
  name: z.string(),
  browser_download_url: z.string(),
  size: z.number(),
})

const GithubReleaseSchema = z.object({
  tag_name: z.string(),
  assets: z.array(GithubAssetSchema),
})

type GithubRelease = z.infer<typeof GithubReleaseSchema>
type GithubAsset = z.infer<typeof GithubAssetSchema>

export type { GithubRelease, GithubAsset }

// --- Platform detection ---

function getPlatformNames(): readonly string[] {
  const p = platform()
  if (p === 'darwin') return ['darwin', 'macos', 'mac', 'apple']
  if (p === 'linux') return ['linux']
  if (p === 'win32') return ['windows', 'win', 'win64']
  return [p]
}

function getArchNames(): readonly string[] {
  const a = arch()
  if (a === 'x64') return ['x86_64', 'amd64', 'x64']
  if (a === 'arm64') return ['arm64', 'aarch64']
  return [a]
}

// --- Public API ---

export async function fetchLatestRelease(owner: string, repo: string): Promise<GithubRelease> {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'usedev-cli',
  }

  const token = process.env['GITHUB_TOKEN']
  if (token !== undefined && token !== '') {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(url, { headers })
  } catch (error) {
    throw new StackError(
      'STACK_004',
      `Failed to fetch releases for ${owner}/${repo}. Check your internet connection.`,
      error instanceof Error ? error : undefined,
    )
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new StackError('STACK_002', `No releases found for ${owner}/${repo}.`)
    }
    throw new StackError(
      'STACK_004',
      `GitHub API error: ${response.status.toString()} ${response.statusText}`,
    )
  }

  const data: unknown = await response.json()
  const parsed = GithubReleaseSchema.safeParse(data)
  if (!parsed.success) {
    throw new StackError('STACK_001', `Invalid release data from GitHub: ${parsed.error.message}`)
  }

  return parsed.data
}

export function pickAsset(release: GithubRelease): GithubAsset | null {
  const platforms = getPlatformNames()
  const arches = getArchNames()

  // Score each asset by how well it matches platform + arch
  let bestAsset: GithubAsset | null = null
  let bestScore = 0

  for (const asset of release.assets) {
    const name = asset.name.toLowerCase()

    // Skip checksums, signatures, source archives
    if (name.endsWith('.sha256') || name.endsWith('.sig') || name.endsWith('.asc')) continue
    if (name.includes('source') || name.includes('src')) continue

    let score = 0

    for (const p of platforms) {
      if (name.includes(p)) {
        score += 10
        break
      }
    }

    for (const a of arches) {
      if (name.includes(a)) {
        score += 5
        break
      }
    }

    // Prefer common binary formats
    if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) score += 2
    if (name.endsWith('.zip')) score += 1
    // Raw binary (no extension or just the name)
    if (!name.includes('.') || name.endsWith('.exe')) score += 3

    if (score > bestScore) {
      bestScore = score
      bestAsset = asset
    }
  }

  // Require at least a platform match
  return bestScore >= 10 ? bestAsset : null
}

export async function downloadBinary(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'usedev-cli' },
  })

  if (!response.ok || response.body === null) {
    throw new StackError(
      'STACK_004',
      `Failed to download: ${response.status.toString()} ${response.statusText}`,
    )
  }

  const tmpPath = join(tmpdir(), `stack-download-${Date.now().toString()}`)
  await mkdir(join(tmpPath, '..'), { recursive: true })

  const lowerUrl = url.toLowerCase()
  const isArchive =
    lowerUrl.endsWith('.tar.gz') || lowerUrl.endsWith('.tgz') || lowerUrl.endsWith('.zip')

  if (isArchive) {
    // Download to temp file, then extract
    const archivePath = tmpPath + (lowerUrl.endsWith('.zip') ? '.zip' : '.tar.gz')
    const fileStream = createWriteStream(archivePath)
    await pipeline(Readable.fromWeb(response.body as ReadableStream), fileStream)

    // Extract — use tar for .tar.gz, unzip for .zip
    const extractDir = tmpPath + '-extracted'
    await mkdir(extractDir, { recursive: true })

    const { exec: execCb } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execAsync = promisify(execCb)

    if (lowerUrl.endsWith('.zip')) {
      await execAsync(`unzip -o "${archivePath}" -d "${extractDir}"`)
    } else {
      await execAsync(`tar -xzf "${archivePath}" -C "${extractDir}"`)
    }

    // Find the binary — look for executable files
    const { readdir, stat, chmod } = await import('node:fs/promises')
    const entries = await readdir(extractDir, { recursive: true })

    let foundBinary: string | null = null
    for (const entry of entries) {
      const fullPath = join(extractDir, entry)
      const s = await stat(fullPath)
      if (
        s.isFile() &&
        !entry.endsWith('.md') &&
        !entry.endsWith('.txt') &&
        !entry.endsWith('.json')
      ) {
        foundBinary = fullPath
        // Prefer files without extensions (likely the binary itself)
        if (!entry.includes('.')) break
      }
    }

    if (foundBinary === null) {
      throw new StackError('STACK_004', 'Could not find binary in downloaded archive.')
    }

    await mkdir(join(destPath, '..'), { recursive: true })
    await rename(foundBinary, destPath)
    await chmod(destPath, 0o755)

    // Cleanup
    await rm(archivePath, { force: true })
    await rm(extractDir, { recursive: true, force: true })
  } else {
    // Direct binary download
    const fileStream = createWriteStream(tmpPath)
    await pipeline(Readable.fromWeb(response.body as ReadableStream), fileStream)

    await mkdir(join(destPath, '..'), { recursive: true })
    await rename(tmpPath, destPath)
    const { chmod } = await import('node:fs/promises')
    await chmod(destPath, 0o755)
  }
}

export async function verifySha256IfAvailable(
  release: GithubRelease,
  asset: GithubAsset,
  filePath: string,
): Promise<boolean> {
  // Look for checksum files
  const checksumNames = ['checksums.txt', 'SHA256SUMS', 'sha256sums.txt', `${asset.name}.sha256`]
  const checksumAsset = release.assets.find((a) =>
    checksumNames.some((n) => a.name.toLowerCase() === n.toLowerCase()),
  )

  if (checksumAsset === undefined) return true // No checksums available — skip

  try {
    const response = await fetch(checksumAsset.browser_download_url, {
      headers: { 'User-Agent': 'usedev-cli' },
    })
    if (!response.ok) return true // Can't fetch checksums — skip

    const text = await response.text()

    // Parse: each line is "hash  filename" or "hash filename"
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '')
    for (const line of lines) {
      const parts = line.split(/\s+/)
      const hash = parts[0]
      if (parts.length >= 2 && hash !== undefined && parts[1] === asset.name) {
        const expectedHash = hash
        const fileContent = await readFile(filePath)
        const actualHash = computeHash(fileContent)

        if (actualHash !== expectedHash) {
          throw new StackError(
            'STACK_003',
            `SHA256 mismatch for ${asset.name}. Expected: ${expectedHash}, got: ${actualHash}`,
          )
        }

        return true // Verified
      }
    }
  } catch (error) {
    if (error instanceof StackError) throw error
    // Parsing failed — skip verification
  }

  return true
}

/**
 * Parse a github: source string into owner and repo.
 * Formats: "github:owner/repo" or "owner/repo"
 */
export function parseGithubSource(source: string): { owner: string; repo: string } {
  const cleaned = source.replace(/^github:/, '')
  const parts = cleaned.split('/')
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
    throw new StackError(
      'STACK_002',
      `Invalid GitHub source: "${source}". Expected format: github:owner/repo`,
    )
  }
  return { owner: parts[0] as string, repo: parts[1] as string }
}
