import { inngest } from '../client.js'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export const recalculatePercentiles = inngest.createFunction(
  { id: 'recalculate-percentiles', name: 'Recalculate Percentiles' },
  { cron: '0 0 * * 1' }, // Every Monday at midnight
  async ({ step }) => {
    const result = await step.run('recalculate', async () => {
      const service = createServiceClient()

      const { error: pctError } = await service.rpc('recalculate_percentiles')
      if (pctError !== null) {
        throw new Error(`recalculate_percentiles failed: ${pctError.message}`)
      }

      const { error: resetError } = await service.rpc('reset_weekly_counters')
      if (resetError !== null) {
        throw new Error(`reset_weekly_counters failed: ${resetError.message}`)
      }

      return { ok: true }
    })

    log('info', 'recalculate-percentiles complete')
    return result
  },
)
