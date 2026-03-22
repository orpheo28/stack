/**
 * auth-token.ts — Supabase token management for the CLI.
 *
 * Handles reading, validating, and auto-refreshing access tokens stored in
 * ~/.stack/auth.json. When an access_token is within 60 seconds of expiry,
 * it is automatically refreshed via the /api/auth/refresh endpoint.
 */

import { readFile, writeFile, rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

// --- Types ---

export interface FullAuthData {
  readonly user_id: string
  readonly username: string
  /** Legacy field — the original one-time CLI token from exchange endpoint */
  readonly token: string
  /** Supabase JWT — used as Bearer token in API calls */
  readonly access_token?: string
  /** Supabase refresh token — opaque, used to get new access_token */
  readonly refresh_token?: string
  /** Unix timestamp (seconds) when access_token expires */
  readonly expires_at?: number
}

// --- Paths ---

function getAuthPath(homeDir?: string): string {
  return join(homeDir ?? homedir(), '.stack', 'auth.json')
}

function getLegacyTokenPath(homeDir?: string): string {
  return join(homeDir ?? homedir(), '.stack', 'auth-token')
}

// --- Read ---

export async function readFullAuth(homeDir?: string): Promise<FullAuthData | null> {
  // Try auth.json (current format) first
  try {
    const raw = await readFile(getAuthPath(homeDir), 'utf-8')
    const data = JSON.parse(raw) as FullAuthData
    // Must have at least one usable token field
    if (typeof data.token === 'string' && data.token !== '') return data
    if (typeof data.access_token === 'string' && data.access_token !== '') return data
  } catch {
    // File missing or corrupt — fall through to legacy
  }

  // Legacy flat file fallback (~/.stack/auth-token) — backward compat
  try {
    const token = await readFile(getLegacyTokenPath(homeDir), 'utf-8')
    const trimmed = token.trim()
    if (trimmed !== '') {
      return { user_id: '', username: '', token: trimmed }
    }
  } catch {
    // No legacy file either
  }

  return null
}

// --- Write ---

export async function saveFullAuth(data: FullAuthData, homeDir?: string): Promise<void> {
  const authPath = getAuthPath(homeDir)
  await mkdir(join(authPath, '..'), { recursive: true })
  await writeFile(authPath, JSON.stringify(data, null, 2), { mode: 0o600 })
}

// --- Clear ---

export async function clearTokens(homeDir?: string): Promise<void> {
  try {
    await rm(getAuthPath(homeDir))
  } catch {
    // File may not exist — that's fine
  }
}

// --- Refresh ---

function getAppUrl(): string {
  // STACK_APP_URL is the base web URL (e.g. https://getstack.com).
  // Avoid deriving from STACK_API_URL via string manipulation — fragile.
  return process.env['STACK_APP_URL'] ?? 'https://getstack.com'
}

interface RefreshResponse {
  access_token: string
  refresh_token: string
  expires_at: number
}

/**
 * Calls /api/auth/refresh with the stored refresh_token and updates auth.json.
 * Returns the new access_token, or null if refresh fails.
 */
export async function refreshAccessToken(homeDir?: string): Promise<string | null> {
  const auth = await readFullAuth(homeDir)
  if (auth?.refresh_token === undefined || auth.refresh_token === '') return null

  const refreshUrl = `${getAppUrl()}/api/auth/refresh`

  let response: Response
  try {
    response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'usedev-cli',
      },
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    })
  } catch {
    // Network error — return null, caller falls back gracefully
    return null
  }

  if (!response.ok) return null

  const data = (await response.json()) as RefreshResponse

  if (typeof data.access_token !== 'string' || data.access_token === '') return null

  // Persist updated tokens
  await saveFullAuth(
    {
      ...auth,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    },
    homeDir,
  )

  return data.access_token
}

// --- getValidToken ---

/**
 * Returns the best available access token, auto-refreshing if needed.
 *
 * Priority:
 * 1. access_token if still valid (>60s remaining) → return directly
 * 2. access_token expired + refresh_token present → auto-refresh, return new token
 * 3. No access_token → fall back to legacy `token` field (pre-OAuth format)
 * 4. Nothing → return null (caller must prompt user to run `stack login`)
 */
export async function getValidToken(homeDir?: string): Promise<string | null> {
  const auth = await readFullAuth(homeDir)
  if (auth === null) return null

  // If we have a Supabase access_token, check if it's still valid
  if (typeof auth.access_token === 'string' && auth.access_token !== '') {
    const expiresAt = auth.expires_at ?? 0
    const nowSeconds = Math.floor(Date.now() / 1000)

    // Still valid (with 60s buffer)
    if (nowSeconds < expiresAt - 60) {
      return auth.access_token
    }

    // Expired — attempt refresh
    if (typeof auth.refresh_token === 'string' && auth.refresh_token !== '') {
      const newToken = await refreshAccessToken(homeDir)
      if (newToken !== null) return newToken
    }

    // Refresh failed — still return the expired token as best-effort
    // The API will return 401, which commands handle with appropriate errors
    return auth.access_token
  }

  // Legacy format: no access_token, just the one-time CLI token
  return auth.token
}
