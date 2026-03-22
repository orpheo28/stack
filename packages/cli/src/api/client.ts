import { z } from 'zod'
import { StackError } from '../types/errors.js'
import { getValidToken, refreshAccessToken } from '../utils/auth-token.js'

// --- Zod Schemas for API response validation ---

const ArtifactConfigSchema = z.object({
  type: z.enum(['mcp', 'cli', 'sdk', 'api', 'config']),
  version: z.string(),
  source: z.string(),
  config: z.record(z.unknown()).optional(),
})

const StackJsonSchema = z.object({
  version: z.string(),
  handle: z.string().optional(),
  claudeMd: z.string().optional(),
  cursorRules: z.string().optional(),
  windsurfRules: z.string().optional(),
  tools: z.record(ArtifactConfigSchema),
})

type ValidatedStackJson = z.infer<typeof StackJsonSchema>

const ToolSearchResultSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  type: z.string(),
  description: z.string(),
  installs: z.number(),
})

const SearchResponseSchema = z.array(ToolSearchResultSchema)

const PublishResponseSchema = z.object({
  url: z.string().optional(),
})

// --- Types ---

export type ToolSearchResult = z.infer<typeof ToolSearchResultSchema>

// --- Config ---

const DEFAULT_BASE_URL = 'https://getstack.com/api'

function getBaseUrl(): string {
  return process.env['STACK_API_URL'] ?? DEFAULT_BASE_URL
}

// --- Helpers ---

async function apiFetch(
  path: string,
  options?: RequestInit & { withAuth?: boolean },
): Promise<Response> {
  const url = `${getBaseUrl()}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'usedev-cli',
  }

  if (options?.headers !== undefined) {
    const extra = options.headers as Record<string, string>
    Object.assign(headers, extra)
  }

  // Inject Authorization header for authenticated endpoints
  const withAuth = options?.withAuth ?? false
  if (withAuth && headers['Authorization'] === undefined) {
    const token = await getValidToken()
    if (token !== null) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (error) {
    throw new StackError(
      'STACK_004',
      'Network error. Check your internet connection and try again.',
      error instanceof Error ? error : undefined,
    )
  }

  // On 401: attempt one token refresh then retry
  if (response.status === 401 && withAuth) {
    const newToken = await refreshAccessToken()
    if (newToken !== null) {
      headers['Authorization'] = `Bearer ${newToken}`
      try {
        response = await fetch(url, { ...options, headers })
      } catch (error) {
        throw new StackError(
          'STACK_004',
          'Network error. Check your internet connection and try again.',
          error instanceof Error ? error : undefined,
        )
      }
    }
  }

  return response
}

// --- Public API ---

export async function fetchHandleManifest(handle: string): Promise<ValidatedStackJson> {
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle
  const response = await apiFetch(`/handles/${cleanHandle}/manifest`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new StackError(
        'STACK_005',
        `Handle @${cleanHandle} not found on getstack.com. Check the spelling.`,
      )
    }
    if (response.status === 429) {
      throw new StackError(
        'STACK_004',
        'Rate limited by getstack.com API. Please wait a moment and try again.',
      )
    }
    throw new StackError(
      'STACK_004',
      `API error: ${response.status.toString()} ${response.statusText}`,
    )
  }

  const data: unknown = await response.json()
  const parsed = StackJsonSchema.safeParse(data)

  if (!parsed.success) {
    throw new StackError(
      'STACK_001',
      `Invalid response from getstack.com API: ${parsed.error.message}`,
    )
  }

  return parsed.data
}

export async function recordCopy(handle: string): Promise<void> {
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle

  try {
    await apiFetch(`/handles/${cleanHandle}/copy`, { method: 'POST' })
  } catch {
    // Non-critical — don't fail the install if analytics fail
  }
}

export async function recordInstall(toolName: string): Promise<void> {
  try {
    await apiFetch(`/tools/${encodeURIComponent(toolName)}/install`, { method: 'POST' })
  } catch {
    // Non-critical — don't fail the install if analytics fail
  }
}

export async function searchTools(query: string): Promise<readonly ToolSearchResult[]> {
  const response = await apiFetch(`/search?q=${encodeURIComponent(query)}`)

  if (!response.ok) {
    return []
  }

  const data: unknown = await response.json()
  const parsed = SearchResponseSchema.safeParse(data)

  return parsed.success ? parsed.data : []
}

export async function publishSetup(manifest: ValidatedStackJson, token?: string): Promise<string> {
  const extraHeaders: Record<string, string> = {}
  if (typeof token === 'string' && token !== '') {
    extraHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await apiFetch('/publish', {
    method: 'POST',
    withAuth: true, // auto-inject + auto-refresh; manual token above takes precedence if set
    headers: extraHeaders,
    body: JSON.stringify(manifest),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new StackError('STACK_006', 'Authentication required. Run "stack login" first.')
    }
    if (response.status === 429) {
      throw new StackError(
        'STACK_004',
        'Rate limited by getstack.com API. Please wait a moment and try again.',
      )
    }
    throw new StackError(
      'STACK_004',
      `Publish failed: ${response.status.toString()} ${response.statusText}`,
    )
  }

  const data: unknown = await response.json()
  const parsed = PublishResponseSchema.safeParse(data)
  const url = parsed.success ? parsed.data.url : undefined

  return url ?? `https://getstack.com/@${manifest.handle ?? 'unknown'}`
}
