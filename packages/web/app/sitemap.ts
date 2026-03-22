import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient()

  const [handlesResult, toolsResult] = await Promise.all([
    supabase.from('handles').select('handle, updated_at'),
    supabase.from('tools').select('name, created_at'),
  ])

  const handles = handlesResult.data ?? []
  const tools = toolsResult.data ?? []

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://use.dev',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://use.dev/search',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  const handlePages: MetadataRoute.Sitemap = handles.map((h) => ({
    url: `https://use.dev/@${h.handle}`,
    lastModified: new Date(h.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  const toolPages: MetadataRoute.Sitemap = tools.map((t) => ({
    url: `https://use.dev/install/${t.name}`,
    lastModified: new Date(t.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...handlePages, ...toolPages]
}
