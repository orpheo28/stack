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
