export type LogLevel = 'info' | 'warn' | 'error'

export interface LogMeta {
  readonly path?: string
  readonly method?: string
  readonly status?: number
  readonly duration_ms?: number
  readonly [key: string]: unknown
}

export function log(level: LogLevel, message: string, meta?: LogMeta): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
  // Structured JSON to stdout — Vercel captures this in function logs
  process.stdout.write(JSON.stringify(entry) + '\n')
}
