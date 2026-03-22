import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

interface NpmPackage {
  name: string
  description: string
  version: string
  keywords: string[]
}

interface NpmSearchResult {
  package: NpmPackage
}

interface NpmSearchResponse {
  objects: NpmSearchResult[]
}

async function searchNpm(query: string, size = 100): Promise<NpmPackage[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${size.toString()}`
  const response = await fetch(url, { headers: { 'User-Agent': 'stackdev-registry/1.0' } })
  if (!response.ok) return []
  const data = (await response.json()) as NpmSearchResponse
  return (data.objects ?? []).map((o) => o.package)
}

function inferType(pkg: NpmPackage): 'mcp' | 'sdk' | 'cli' | 'api' {
  const name = pkg.name.toLowerCase()
  const kws = pkg.keywords?.map((k) => k.toLowerCase()) ?? []

  if (kws.includes('mcp') || kws.includes('mcp-server') || name.includes('mcp')) return 'mcp'
  if (kws.includes('sdk') || name.includes('-sdk')) return 'sdk'
  if (kws.includes('cli') || name.endsWith('-cli')) return 'cli'
  return 'api'
}

export const syncRegistryNpm = inngest.createFunction(
  { id: 'sync-registry-npm', name: 'Sync Registry — npm' },
  { cron: '0 */6 * * *' },
  async ({ step }) => {
    // Step 1: Fetch npm packages with MCP-related keywords
    const packages = await step.run('search-npm', async () => {
      const [byKeyword, byPrefix] = await Promise.all([
        searchNpm('keywords:mcp-server'),
        searchNpm('@modelcontextprotocol'),
      ])

      // Dedup by name
      const seen = new Set<string>()
      const all: NpmPackage[] = []
      for (const pkg of [...byKeyword, ...byPrefix]) {
        if (!seen.has(pkg.name)) {
          seen.add(pkg.name)
          all.push(pkg)
        }
      }
      return all
    })

    // Step 2: Batch upsert into tools table — single DB call for all packages
    const upserted = await step.run('upsert-tools', async () => {
      if (packages.length === 0) return 0

      const service = createServiceClient()

      const rows = packages.map((pkg) => ({
        name: pkg.name.replace(/^@/, '').replace(/\//g, '-').toLowerCase(),
        display_name: pkg.name.replace(/^@[^/]+\//, '').replace(/-/g, ' '),
        type: inferType(pkg),
        source: `npm:${pkg.name}`,
        version: pkg.version,
        description: (pkg.description as string | null | undefined) ?? null,
      }))

      const { error, data } = await service
        .from('tools')
        .upsert(rows, { onConflict: 'name', ignoreDuplicates: false })
        .select('id')

      if (error !== null) {
        throw new Error(`npm upsert failed: ${error.message}`)
      }

      return data?.length ?? rows.length
    })

    log('info', 'sync-registry-npm complete', { packages: packages.length, upserted })
    return { upserted }
  },
)
