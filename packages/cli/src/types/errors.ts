export const ERROR_CODES = {
  STACK_001: 'Invalid JSON in config file',
  STACK_002: 'Package not found in registry',
  STACK_003: 'SHA256 hash mismatch (integrity failure)',
  STACK_004: 'Network unavailable',
  STACK_005: 'Handle not found',
  STACK_006: 'Insufficient permissions',
  STACK_007: 'Client active during install (restart required)',
  STACK_008: 'Incompatible Node.js version',
  STACK_009: 'Path outside whitelist (security block)',
  STACK_010: 'Prompt injection detected in external CLAUDE.md',
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export class StackError extends Error {
  public readonly code: ErrorCode
  public readonly suggestion: string

  constructor(code: ErrorCode, suggestion: string, cause?: Error) {
    const message = `[${code}] ${ERROR_CODES[code]}`
    super(message, { cause })
    this.name = 'StackError'
    this.code = code
    this.suggestion = suggestion
  }
}

export function isStackError(error: unknown): error is StackError {
  return error instanceof StackError
}
