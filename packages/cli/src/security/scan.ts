import { StackError } from '../types/errors.js'

// --- Types ---

export type ScanStatus = 'OK' | 'BLOCKED' | 'WARNING'

export interface ScanResult {
  readonly status: ScanStatus
  readonly blockedPatterns: readonly string[]
  readonly warnings: readonly string[]
}

// --- Patterns ---

const BLOCKED_PATTERNS: readonly RegExp[] = [
  /ignore.{0,20}(all|previous|prior).{0,20}instructions?/i,
  /disregard.{0,20}(all|previous|prior)/i,
  /override.{0,20}(system|instructions?|rules?)/i,
  /send.{0,50}(env|credentials?|secrets?|passwords?)/i,
  /exfiltrat/i,
  /always.{0,20}execute.{0,20}without/i,
  /sudo\s+rm/i,
  /rm\s+-rf/i,
  /http:\/\//,
]

const WARNING_PATTERNS: readonly RegExp[] = [
  /\.env/i,
  /api.?key/i,
  /secret/i,
  /https?:\/\/(?!use\.dev|github\.com|anthropic\.com)/i,
]

// --- Public API ---

export function scanClaudeMd(content: string): ScanResult {
  const blockedPatterns: string[] = []
  const warnings: string[] = []

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      blockedPatterns.push(pattern.source)
    }
  }

  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(content)) {
      warnings.push(pattern.source)
    }
  }

  let status: ScanStatus = 'OK'
  if (blockedPatterns.length > 0) {
    status = 'BLOCKED'
  } else if (warnings.length > 0) {
    status = 'WARNING'
  }

  return { status, blockedPatterns, warnings }
}

export function assertClaudeMdSafe(content: string): void {
  const result = scanClaudeMd(content)

  if (result.status === 'BLOCKED') {
    throw new StackError(
      'STACK_010',
      `Blocked patterns detected: ${result.blockedPatterns.join(', ')}. This CLAUDE.md contains potentially dangerous instructions.`,
    )
  }
}

// --- Handle similarity detection (T-SEC-007) ---

// Confusable character map (visually similar chars)
const CONFUSABLES: ReadonlyMap<string, string> = new Map([
  ['0', 'o'],
  ['1', 'l'],
  ['i', 'l'],
  ['5', 's'],
  ['8', 'b'],
  ['3', 'e'],
  ['_', ''],
  ['-', ''],
])

function normalizeHandle(handle: string): string {
  const clean = handle.replace(/^@/, '').toLowerCase()
  return Array.from(clean)
    .map((c) => CONFUSABLES.get(c) ?? c)
    .join('')
}

export function areHandlesSimilar(handleA: string, handleB: string): boolean {
  const a = handleA.replace(/^@/, '').toLowerCase()
  const b = handleB.replace(/^@/, '').toLowerCase()

  // Exact match after lowercase
  if (a === b) return false // same handle, not "similar"

  // Confusable normalization match
  if (normalizeHandle(a) === normalizeHandle(b)) return true

  // Levenshtein distance ≤ 2
  return levenshtein(a, b) <= 2
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0))

  for (let i = 0; i <= m; i++) {
    const row = dp[i]
    if (row) row[0] = i
  }
  for (let j = 0; j <= n; j++) {
    const row = dp[0]
    if (row) row[j] = j
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const prevRow = dp[i - 1]
      const currRow = dp[i]
      if (prevRow && currRow) {
        currRow[j] = Math.min(
          (prevRow[j] ?? 0) + 1,
          (currRow[j - 1] ?? 0) + 1,
          (prevRow[j - 1] ?? 0) + cost,
        )
      }
    }
  }

  return dp[m]?.[n] ?? 0
}
