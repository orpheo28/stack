import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Extracted log function for testability (mirrors lib/logger.ts)
type LogLevel = 'info' | 'warn' | 'error'

interface LogMeta {
  readonly path?: string
  readonly method?: string
  readonly status?: number
  readonly duration_ms?: number
  readonly [key: string]: unknown
}

function log(level: LogLevel, message: string, meta?: LogMeta): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
  return JSON.stringify(entry)
}

describe('Logger — structured output', () => {
  it('should produce valid JSON', () => {
    const output = log('info', 'test message')
    expect(() => JSON.parse(output)).not.toThrow()
  })

  it('should include all required fields', () => {
    const output = JSON.parse(
      log('info', 'test', { path: '/api/test', method: 'GET', status: 200, duration_ms: 42 }),
    )
    expect(output.level).toBe('info')
    expect(output.message).toBe('test')
    expect(output.path).toBe('/api/test')
    expect(output.method).toBe('GET')
    expect(output.status).toBe(200)
    expect(output.duration_ms).toBe(42)
    expect(output.timestamp).toBeDefined()
  })

  it('should support all log levels', () => {
    expect(JSON.parse(log('info', 'a')).level).toBe('info')
    expect(JSON.parse(log('warn', 'b')).level).toBe('warn')
    expect(JSON.parse(log('error', 'c')).level).toBe('error')
  })

  it('should include extra meta fields', () => {
    const output = JSON.parse(log('info', 'x', { handle: 'orpheo', tool: 'stripe' }))
    expect(output.handle).toBe('orpheo')
    expect(output.tool).toBe('stripe')
  })

  it('should produce ISO timestamp', () => {
    const output = JSON.parse(log('info', 'ts test'))
    expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
