import { useCallback, useEffect, useState } from 'react'

import { api } from '@/lib/api-handler'
import { toDateKey } from '@/lib/date'
import { fetchCached } from '@/lib/query-cache'
import type { DayDashboard } from '@/types/time-entry'

export { toDateKey } from '@/lib/date'

export function useDayDashboard(date: string) {
  const [dashboard, setDashboard] = useState<DayDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboard = useCallback(async (force = false) => {
    setIsLoading(true)

    try {
      const data = await fetchCached(
        `day:${date}`,
        () =>
          api<DayDashboard>(
            `/time-entries/day?date=${encodeURIComponent(date)}`,
            { toastOnError: false },
          ),
        60_000,
        force,
      )
      setDashboard(data)
    } finally {
      setIsLoading(false)
    }
  }, [date])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  return { dashboard, isLoading, reload: () => loadDashboard(true) }
}
