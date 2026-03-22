import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

interface GitHubRepo {
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  default_branch: string
}

interface GitHubSearchResponse {
  items: GitHubRepo[]
}

async function searchGitHub(topic: string, page = 1): Promise<GitHubRepo[]> {
  const token = process.env['GITHUB_TOKEN']
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'stackdev-registry/1.0',
  }
  if (token !== undefined && token !== '') {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}&sort=stars&per_page=100&page=${page.toString()}`
  const response = await fetch(url, { headers })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub rate limit hit — will retry next run')
    }
    return []
  }

  const data = (await response.json()) as GitHubSearchResponse
  return data.items ?? []
}

export const syncRegistryGithub = inngest.createFunction(
  { id: 'sync-registry-github', name: 'Sync Registry — GitHub' },
  // Offset by 3h from npm sync to spread rate limit pressure
  { cron: '0 3 * * *' },
  async ({ step }) => {
    const repos = await step.run('search-github', async () => {
      return searchGitHub('mcp-server')
    })

    const upserted = await step.run('upsert-tools', async () => {
      if (repos.length === 0) return 0

      const service = createServiceClient()

      const rows = repos.map((repo) => ({
        name: repo.full_name.replace('/', '-').toLowerCase(),
        display_name: repo.name.replace(/-/g, ' '),
        type: 'mcp' as const,
        source: `github:${repo.full_name}`,
        description: repo.description ?? null,
      }))

      const { error, data } = await service
        .from('tools')
        .upsert(rows, { onConflict: 'name', ignoreDuplicates: true })
        .select('id')

      if (error !== null) {
        throw new Error(`github upsert failed: ${error.message}`)
      }

      return data?.length ?? rows.length
    })

    log('info', 'sync-registry-github complete', { repos: repos.length, upserted })
    return { upserted }
  },
)
