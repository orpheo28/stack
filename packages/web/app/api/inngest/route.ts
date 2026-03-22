import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { syncRegistryNpm } from '@/lib/inngest/functions/sync-registry-npm'
import { syncRegistryGithub } from '@/lib/inngest/functions/sync-registry-github'
// recalculatePercentiles intentionally excluded — handled by Vercel cron
// (/api/cron/weekly-reset, schedule: 0 0 * * 1 in vercel.json)
// to avoid double reset + corrupted percentiles on Monday midnight.

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncRegistryNpm, syncRegistryGithub],
})
